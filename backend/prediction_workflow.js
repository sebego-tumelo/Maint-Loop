import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { generateUniqueCandidates, scoreAndFilterCandidates } from './candidateGenerator.js';
import { getActiveRules, appendToJournal, OKF_DIR } from './okf_utils.js';
import { Prediction } from './models/Prediction.js';
import path from 'path';

export async function getTodaysPrediction() {
  const drawDate = new Date().toISOString().split('T')[0];
  return await Prediction.findOne({ draw_date: drawDate });
}

export async function getRecentEvaluatedPredictions(limit = 10) {
  return await Prediction.find({ 'actual_outcome.evaluated': true })
    .sort({ draw_date: -1 })
    .limit(limit)
    .select('draw_date predicted_sets actual_outcome evaluation_metrics');
}

// Reusing model config
const gemmaCloudModel = {
  id: process.env.OLLAMA_MODEL || 'gemma4:31b',
  name: 'Gemma 4 Cloud Engine',
  api: 'openai-completions',
  provider: 'ollama-cloud',
  baseUrl: 'https://ollama.com/v1',
  reasoning: true,
  input: ['text'],
  contextWindow: 256000,
  maxTokens: 8192,
};

export async function prepareCandidates() {
  const activeRules = await getActiveRules();
  const recentPredictions = await getRecentEvaluatedPredictions();
  const rulesPath = path.join(OKF_DIR, 'rules.json');
  const rawCandidates = await generateUniqueCandidates(1000);
  const top20 = await scoreAndFilterCandidates(rawCandidates, rulesPath);
  return { activeRules, top20, recentPredictions };
}

export async function synthesizePrediction(top20, activeRules, recentPredictions, count = 3, todaysPrediction = null) {
  const existingNumbers = todaysPrediction ? todaysPrediction.predicted_sets.map(s => s.numbers) : [];
  
  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: `You are in MODE B: CANDIDATE GENERATOR & PREDICTION SYNTHESIS.
        Select the top ${count} sets from the provided top 20 candidates.
        
        CRITICAL: Do not select these sets as they are already predicted for today: ${JSON.stringify(existingNumbers)}.
        
        Draft a journal entry for /okf/journal.md explaining your selection based on: ${JSON.stringify(activeRules)}.
        
        Use this recent performance history to inform your selection:
        ${JSON.stringify(recentPredictions)}
        
        Return ONLY a JSON object with: { 
          "summary": "...",
          "rationale_narrative": "...",
          "selected_draws": [
            { "numbers": [...], "expected_sum": ..., "parity": "...", "set_rationale": "..." },
            ...
          ]
        }`,
      messages: [],
    }
  });

  agent.streamFn = (model, context, options) => {
    return streamSimple(model, context, {
      ...options,
      apiKey: process.env.OLLAMA_API_KEY,
      headers: { 'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}` }
    });
  };

  await agent.prompt(`Analyze these candidates and select the top ${count}: ${JSON.stringify(top20)}`);
  
  const lastMessage = agent.state.messages[agent.state.messages.length - 1];
  const responseText = lastMessage.content.map(p => p.text).join('');
  
  const jsonMatch = responseText.match(/\{.*\}/s);
  if (!jsonMatch) throw new Error('No JSON in response');
  
  return JSON.parse(jsonMatch[0]);
}

export async function persistPrediction(parsed, top20, targetCount) {
  // Save to Journal
  await appendToJournal({
    entry_type: "PREDICTION_SYNTHESIS",
    summary: parsed.summary,
  });

  const drawDate = new Date().toISOString().split('T')[0];

  // Find existing prediction for today
  let prediction = await Prediction.findOne({ draw_date: drawDate });

  let selectedSets = parsed.selected_draws;

  if (prediction) {
    console.log('🔄 Appending to existing prediction for:', drawDate);

    // Filter out duplicate sets (based on numbers array equality)
    const newSets = selectedSets.filter(
      (newSet) =>
        !prediction.predicted_sets.some(
          (existingSet) =>
            JSON.stringify(existingSet.numbers.sort((a, b) => a - b)) ===
            JSON.stringify(newSet.numbers.sort((a, b) => a - b))
        )
    );

    // If still not enough sets, fill from top20
    let currentTotalCount = prediction.predicted_sets.length + newSets.length;
    if (currentTotalCount < targetCount) {
      console.log(`ℹ️ Need ${targetCount - currentTotalCount} more sets, filling from top20...`);
      for (const candidate of top20) {
        if (currentTotalCount >= targetCount) break;
        
        const isDuplicate = prediction.predicted_sets.some(
          (existingSet) => JSON.stringify(existingSet.numbers.sort((a, b) => a - b)) === JSON.stringify(candidate.numbers.sort((a, b) => a - b))
        ) || newSets.some(
          (newSet) => JSON.stringify(newSet.numbers.sort((a, b) => a - b)) === JSON.stringify(candidate.numbers.sort((a, b) => a - b))
        );

        if (!isDuplicate) {
          newSets.push({
            numbers: candidate.numbers,
            expected_sum: candidate.expected_sum || 0,
            parity: candidate.parity || "N/A",
            set_rationale: "Automatically generated to fill requested count.",
          });
          currentTotalCount++;
        }
      }
    }

    if (newSets.length === 0) {
      console.log('ℹ️ No new unique sets to add.');
      return { ...prediction.toObject(), _id: prediction._id };
    }

    // Add new sets
    const nextRank = prediction.predicted_sets.length + 1;
    newSets.forEach((set, index) => {
      prediction.predicted_sets.push({
        rank: nextRank + index,
        numbers: set.numbers,
        expected_sum: set.expected_sum,
        parity: set.parity,
        set_rationale: set.set_rationale,
      });
    });

    // Update financials
    const newBoardCount = prediction.predicted_sets.length;
    prediction.financials.total_cost_rand = newBoardCount * 3;
    prediction.financials.net_profit_loss_rand = -prediction.financials.total_cost_rand;
    
    await prediction.save();
    return { ...prediction.toObject(), _id: prediction._id };
  } else {
    // Create new (ensure we have targetCount sets)
    let finalSets = selectedSets;
    if (finalSets.length < targetCount) {
       console.log(`ℹ️ Need ${targetCount - finalSets.length} more sets, filling from top20...`);
       for (const candidate of top20) {
        if (finalSets.length >= targetCount) break;
        const isDuplicate = finalSets.some(
          (s) => JSON.stringify(s.numbers.sort((a, b) => a - b)) === JSON.stringify(candidate.numbers.sort((a, b) => a - b))
        );
        if (!isDuplicate) {
          finalSets.push({
            numbers: candidate.numbers,
            expected_sum: candidate.expected_sum || 0,
            parity: candidate.parity || "N/A",
            set_rationale: "Automatically generated to fill requested count.",
          });
        }
       }
    }

    console.log('✨ Creating new prediction for:', drawDate);
    prediction = new Prediction({
      draw_date: drawDate,
      summary: parsed.summary,
      rationale_narrative: parsed.rationale_narrative,
      predicted_sets: finalSets.map((set, index) => ({
        rank: index + 1,
        numbers: set.numbers,
        expected_sum: set.expected_sum,
        parity: set.parity,
        set_rationale: set.set_rationale,
      })),
      financials: {
        total_cost_rand: finalSets.length * 3,
        total_payout_rand: 0,
        net_profit_loss_rand: -(finalSets.length * 3),
        roi_percentage: -100.0,
      },
    });
    await prediction.save();
    return { ...prediction.toObject(), _id: prediction._id };
  }
}

export async function runPrediction(boardCount = 3) {
  console.log('🔮 Starting AI-driven prediction synthesis...');
  
  try {
    const { activeRules, top20, recentPredictions } = await prepareCandidates();
    const todaysPrediction = await getTodaysPrediction();
    const parsed = await synthesizePrediction(top20, activeRules, recentPredictions, boardCount, todaysPrediction);
    return await persistPrediction(parsed, top20, boardCount);
  } catch (error) {
    console.error('❌ Error during AI prediction:', error);
    throw error;
  }
}
