import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { generateUniqueCandidates, scoreAndFilterCandidates } from './candidateGenerator.js';
import { getActiveRules, getRecentJournalEntries, appendToJournal } from './okf_utils.js';
import { Prediction } from './models/Prediction.js';

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

export async function prepareCandidates(poolSize = 20, strategy = 'ADDITIVE_JITTER') {
  const activeRules = await getActiveRules();
  const recentPredictions = await getRecentEvaluatedPredictions();
  const recentJournal = await getRecentJournalEntries(10);
  const rawCandidates = await generateUniqueCandidates(10000);
  const topCandidates = scoreAndFilterCandidates(rawCandidates, activeRules.rules, poolSize, strategy);
  return { activeRules, topCandidates, recentPredictions, recentJournal };
}

export async function synthesizePrediction(topCandidates, activeRules, recentPredictions, recentJournal, count = 3, todaysPrediction = null) {
  const existingNumbers = todaysPrediction ? todaysPrediction.predicted_sets.map(s => s.numbers) : [];
  const poolSize = topCandidates.length;
  
  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: `You are in MODE B: CANDIDATE GENERATOR & PREDICTION SYNTHESIS.
        Select the top ${count} sets from the provided top ${poolSize} candidates.
        
        CRITICAL: Do not select these sets as they are already predicted for today: ${JSON.stringify(existingNumbers)}.
        
        Use these previous strategic findings to inform your selection:
        ${JSON.stringify(recentJournal)}

        Explain your selection based on these active rules: 
        ${JSON.stringify(activeRules)}.
        
        Use this recent performance history to inform your selection:
        ${JSON.stringify(recentPredictions)}
        
        CRITICAL RANKING INSTRUCTION: Each candidate has a 'composite_score'. This score represents a weighted measure of historical winning patterns, where a higher score indicates a higher statistical probability of winning.
        
        DIVERSIFICATION STRATEGY: You MUST prioritize candidates with the highest 'composite_score'. However, DO NOT select sets that all satisfy the exact same rules. Ensure your final selection is a diverse portfolio that covers different rule patterns (e.g., some satisfying consecutive pair rules, some satisfying low-number density rules). Check the 'satisfied_rules' array in the 'metrics' for each candidate to diversify your selection.

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

  await agent.prompt(`Analyze these candidates and select the top ${count}: ${JSON.stringify(topCandidates)}`);
  
  const lastMessage = agent.state.messages[agent.state.messages.length - 1];
  const responseText = lastMessage.content.map(p => p.text).join('');
  
  const jsonMatch = responseText.match(/\{.*\}/s);
  if (!jsonMatch) throw new Error('No JSON in response');
  
  return JSON.parse(jsonMatch[0]);
}

export async function persistPrediction(parsed, top20, targetCount, strategyUsed = 'balanced') {
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

    // If still not enough sets, fill from topCandidates
    let currentTotalCount = prediction.predicted_sets.length + newSets.length;
    if (currentTotalCount < targetCount) {
      console.log(`ℹ️ Need ${targetCount - currentTotalCount} more sets, filling from pool...`);
      for (const candidate of topCandidates) {
        if (currentTotalCount >= targetCount) break;
        
        const isDuplicate = prediction.predicted_sets.some(
          (existingSet) => JSON.stringify(existingSet.numbers.sort((a, b) => a - b)) === JSON.stringify(candidate.combination.sort((a, b) => a - b))
        ) || newSets.some(
          (newSet) => JSON.stringify(newSet.numbers.sort((a, b) => a - b)) === JSON.stringify(candidate.combination.sort((a, b) => a - b))
        );

        if (!isDuplicate) {
          newSets.push({
            numbers: candidate.combination,
            expected_sum: candidate.metrics.sum || 0,
            parity: candidate.metrics.parity || "N/A",
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
       console.log(`ℹ️ Need ${targetCount - finalSets.length} more sets, filling from pool...`);
       for (const candidate of topCandidates) {
        if (finalSets.length >= targetCount) break;
        const isDuplicate = finalSets.some(
          (s) => JSON.stringify(s.numbers.sort((a, b) => a - b)) === JSON.stringify(candidate.combination.sort((a, b) => a - b))
        );
        if (!isDuplicate) {
          finalSets.push({
            numbers: candidate.combination,
            expected_sum: candidate.metrics.sum || 0,
            parity: candidate.metrics.parity || "N/A",
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
      candidate_pool: top20.map((candidate) => ({
        combination: candidate.combination,
        metrics: candidate.metrics,
        composite_score: candidate.composite_score,
      })),
      financials: {
        total_cost_rand: finalSets.length * 3,
        total_payout_rand: 0,
        net_profit_loss_rand: -(finalSets.length * 3),
        roi_percentage: -100.0,
      },
      strategy_used: strategyUsed,
    });
    await prediction.save();
    return { ...prediction.toObject(), _id: prediction._id };
  }
}

export async function runReflection(recentPredictions, recentJournal) {
  if (recentPredictions.length === 0) return "No recent performance to reflect on.";

  const lastPrediction = recentPredictions[0];
  const lastJournal = recentJournal.length > 0 ? recentJournal[0] : "No recent journal context.";

  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: `You are an expert lottery strategist. Reflect on the past performance of the prediction set against actual results and your previous journaled logic.
      
      Predictive Analysis Context:
      Previous Prediction: ${JSON.stringify(lastPrediction.predicted_sets)}
      Actual Result: ${JSON.stringify(lastPrediction.actual_outcome.winning_numbers)}
      Previous Journal Strategy: ${JSON.stringify(lastJournal)}

      Return ONLY a JSON object with: { "learned_lesson": "A concise strategic lesson learned based on this outcome." }`,
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

  await agent.prompt("Perform reflection.");
  const lastMessage = agent.state.messages[agent.state.messages.length - 1];
  const responseText = lastMessage.content.map(p => p.text).join('');
  const jsonMatch = responseText.match(/\{.*\}/s);
  if (!jsonMatch) return "Reflection failed.";
  
  return JSON.parse(jsonMatch[0]).learned_lesson;
}

export async function runPrediction(boardCount = 3, poolSize = 50, uiStrategy = 'balanced') {
  console.log(`🔮 Starting AI-driven prediction synthesis (Strategy: ${uiStrategy})...`);
  
  try {
    const { rules, system_info } = await getActiveRules();
    
    // Deep copy rules to avoid modifying DB directly
    let modifiedRules = JSON.parse(JSON.stringify(rules));
    
    // Strategy Mapping Logic: Adjust rule weights based on UI strategy
    if (uiStrategy === 'hot') {
        // Boost 'low numbers' rule or similar frequency rules
        modifiedRules.forEach(rule => {
            if (rule.rule_id === "RULE_LOW_NUMBERS_07") {
                rule.scoring.multiplier = (rule.scoring.multiplier || 1.0) * 1.5;
            }
        });
    } else if (uiStrategy === 'frequency') {
        // Boost 'decade spread' rule
        modifiedRules.forEach(rule => {
            if (rule.rule_id === "RULE_DECADE_SPREAD_01") {
                rule.scoring.penalty_if_violated = (rule.scoring.penalty_if_violated || 0.1) * 2;
            }
        });
    }

    const { activeRules, topCandidates, recentPredictions, recentJournal } = await prepareCandidates(
        poolSize, 
        'ADDITIVE_JITTER', 
        { rules: modifiedRules, system_info }
    );
    
    // 1. Run Reflection
    console.log('🧠 Running reflection on recent performance...');
    const learnedLesson = await runReflection(recentPredictions, recentJournal);
    
    // 2. Persist Reflection to Journal
    await appendToJournal({
      entry_type: "REFLECTION",
      summary: "Strategic reflection based on previous performance.",
      learned_lesson: learnedLesson
    });
    console.log('✅ Reflection persisted.');

    // 3. Synthesis
    const todaysPrediction = await getTodaysPrediction();
    const parsed = await synthesizePrediction(topCandidates, activeRules, recentPredictions, recentJournal, boardCount, todaysPrediction);
    
    // Pass the strategy to persistPrediction
    return await persistPrediction(parsed, topCandidates, boardCount, uiStrategy);
  } catch (error) {
    console.error('❌ Error during AI prediction:', error);
    throw error;
  }
}
