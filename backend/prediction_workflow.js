import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { generateUniqueCandidates, scoreAndFilterCandidates } from './candidateGenerator.js';
import { getActiveRules, appendToJournal, OKF_DIR } from './okf_utils.js';
import { Prediction } from './models/Prediction.js';
import path from 'path';

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

export async function synthesizePrediction(top20, activeRules, recentPredictions) {
  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: `You are in MODE B: CANDIDATE GENERATOR & PREDICTION SYNTHESIS.
        Select the top 3 sets from the provided top 20 candidates. 
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

  await agent.prompt(`Analyze these candidates and select the top 3: ${JSON.stringify(top20)}`);
  
  const lastMessage = agent.state.messages[agent.state.messages.length - 1];
  const responseText = lastMessage.content.map(p => p.text).join('');
  
  const jsonMatch = responseText.match(/\{.*\}/s);
  if (!jsonMatch) throw new Error('No JSON in response');
  
  return JSON.parse(jsonMatch[0]);
}

export async function persistPrediction(parsed) {
  // Save to Journal
  await appendToJournal({
    entry_type: "PREDICTION_SYNTHESIS",
    summary: parsed.summary,
  });

  const drawDate = new Date().toISOString().split('T')[0];

  // Find existing prediction for today
  let prediction = await Prediction.findOne({ draw_date: drawDate });

  if (prediction) {
    console.log('🔄 Appending to existing prediction for:', drawDate);

    // Filter out duplicate sets (based on numbers array equality)
    const newSets = parsed.selected_draws.filter(
      (newSet) =>
        !prediction.predicted_sets.some(
          (existingSet) =>
            JSON.stringify(existingSet.numbers.sort((a, b) => a - b)) ===
            JSON.stringify(newSet.numbers.sort((a, b) => a - b))
        )
    );

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
    // Create new
    console.log('✨ Creating new prediction for:', drawDate);
    prediction = new Prediction({
      draw_date: drawDate,
      summary: parsed.summary,
      rationale_narrative: parsed.rationale_narrative,
      predicted_sets: parsed.selected_draws.map((set, index) => ({
        rank: index + 1,
        numbers: set.numbers,
        expected_sum: set.expected_sum,
        parity: set.parity,
        set_rationale: set.set_rationale,
      })),
      financials: {
        total_cost_rand: parsed.selected_draws.length * 3,
        total_payout_rand: 0,
        net_profit_loss_rand: -(parsed.selected_draws.length * 3),
        roi_percentage: -100.0,
      },
    });
    await prediction.save();
    return { ...prediction.toObject(), _id: prediction._id };
  }
}

export async function runPrediction() {
  console.log('🔮 Starting AI-driven prediction synthesis...');
  
  try {
    const { activeRules, top20, recentPredictions } = await prepareCandidates();
    const parsed = await synthesizePrediction(top20, activeRules, recentPredictions);
    return await persistPrediction(parsed);
  } catch (error) {
    console.error('❌ Error during AI prediction:', error);
    throw error;
  }
}
