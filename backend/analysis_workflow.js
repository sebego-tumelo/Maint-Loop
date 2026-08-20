import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { Prediction } from './models/Prediction.js';
import { LottoMetadata } from './models/LottoMetadata.js';
import { syncAndGetStats, writeToScrapbook } from './utils.js';
import { 
  getActiveRules, 
  appendToJournal, 
  updateRulesFile 
} from './okf_utils.js';

export const analysisSystemInstruction = `
You are an advanced lottery analysis agent operating in MODE A: DATASET ANALYSIS & RULE DISCOVERY for Daily Lotto (5/36).
Your goal is to evaluate raw historical draw data, observe statistical anomalies, mutate rule weights in /okf/rules.json, and record entries in /okf/journal.md.

OUTPUT FORMAT:
You MUST return ONLY a valid JSON object. Do not include introductory text, markdown headers, or code blocks.
The JSON must follow this exact structure:
{
  "step": 1,
  "status": "COMPLETE",
  "okf_journal_draft": {
    "entry_type": "RULE_MUTATION",
    "summary": "A brief summary of your analysis findings.",
    "rule_updates": [
      {
        "rule_id": "string",
        "historical_occurrence_rate": 0.0,
        "action": "BOOST_WEIGHT" | "PENALIZE_WEIGHT" | "MAINTAIN_WEIGHT",
        "justification": "string"
      }
    ]
  },
  "tool_calls": [],
  "next_prompt_payload": null
}
`;

import { validateAgentResponse } from './validator.js';

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

export async function runAnalysis() {
  console.log('🚀 Starting AI-driven background analysis...');
  try {
    // 1. Get Data
    const { stats, activeRulesObj } = await fetchAnalysisData();
    
    // 2. Evaluate pending predictions
    await evaluateUnevaluatedPredictions(stats.rawDrawHistory);

    // 3. Perform Dataset Analysis
    const limitedStats = {
      ...stats,
      rawDrawHistory: stats.rawDrawHistory.slice(0, 100)
    };
    const agent = setupAgent(activeRulesObj);

    const instruction = `Analyze this dataset: ${JSON.stringify(limitedStats)}. Perform rule discovery and propose updates.`;
    console.log('DEBUG: Sending prompt to agent:', instruction.substring(0, 500) + '...');
    
    agent.subscribe(async (event) => {
      if (event.type === 'agent_end') {
        await handleAgentCompletion(agent, stats);
      }
    });

    await agent.prompt(instruction);

  } catch (error) {
    console.error('❌ Error during AI analysis:', error);
  }
}

export async function evaluatePredictionFinancials(drawDate) {
  const prediction = await Prediction.findOne({ draw_date: drawDate });
  if (!prediction) throw new Error(`No prediction found for date: ${drawDate}`);

  // Fetch all results via API instead of DB query
  const { rawDrawHistory } = await syncAndGetStats();
  const drawResult = rawDrawHistory.find(r => r.drawDate === drawDate);
  
  if (!drawResult) throw new Error(`No draw result found for date: ${drawDate}`);
  
  if (!drawResult.prizeDivisions || drawResult.prizeDivisions.length === 0) {
    console.warn(`⚠️ No prize division data available for ${drawDate}, skipping financial evaluation.`);
    return null;
  }

  // Calculate payouts
  let totalPayout = 0;
  for (const set of prediction.predicted_sets) {
    const winningNumbers = drawResult.winningNumbers;
    const matchCount = set.numbers.filter(n => winningNumbers.includes(n)).length;
    const division = drawResult.prizeDivisions.find(pd => parseInt(pd.matches) === matchCount);
    if (division) {
      totalPayout += division.prize.amount;
    }
  }

  // Update financials
  const cost = prediction.financials.total_cost_rand;
  prediction.financials.total_payout_rand = totalPayout;
  prediction.financials.net_profit_loss_rand = totalPayout - cost;
  prediction.financials.roi_percentage = cost > 0 ? ((totalPayout - cost) / cost) * 100 : 0;

  await prediction.save();
  console.log(`✅ Financials updated for ${drawDate}: Profit/Loss = R${prediction.financials.net_profit_loss_rand}`);
  return prediction.financials;
}

async function evaluateUnevaluatedPredictions(rawDrawHistory) {
  const unevaluated = await Prediction.find({ 'actual_outcome.evaluated': { $ne: true } });
  
  if (unevaluated.length === 0) {
    console.log('✅ No unevaluated predictions found.');
    return;
  }

  const history = rawDrawHistory || [];
  console.log('latest historical draw data:', history[0]);
  for (const prediction of unevaluated) {
    const historicalResult = history.find(r => r.drawDate === prediction.draw_date);
    
    if (!historicalResult) {
      console.log(`⚠️ No historical data found for ${prediction.draw_date}, skipping.`);
      continue;
    }

    console.log(`📊 Evaluating prediction for ${prediction.draw_date}...`);
    
    // Calculate metrics
    const winningNumbers = historicalResult.winningNumbers;
    const actualSum = winningNumbers.reduce((a, b) => a + b, 0);
    
    // Simple intersection count
    const getMatches = (set) => set.filter(n => winningNumbers.includes(n));
    
    // Determine outcomes for each set
    const evaluationResults = prediction.predicted_sets.map(set => ({
      ...set,
      matching_numbers: getMatches(set.numbers),
      match_count: getMatches(set.numbers).length
    }));
    
    // Prepare for AI-driven summary
    const bestMatch = evaluationResults.reduce((prev, curr) => (curr.match_count > prev.match_count ? curr : prev));
    
    // Get AI-driven evaluation summary
    const summary = await getAIAnalysisSummary(prediction, winningNumbers);

    prediction.actual_outcome = {
      winning_numbers: winningNumbers,
      actual_sum: actualSum,
      evaluated: true,
      evaluated_at: new Date(),
      evaluation_summary: summary
    };
    
    prediction.evaluation_metrics = {
      best_match_count: bestMatch.match_count,
      matching_numbers: bestMatch.matching_numbers,
      successful_rules: [], // Could be inferred
      failed_rules: []
    };

    await prediction.save();
    console.log(`✅ Prediction evaluated for ${prediction.draw_date}.`);
  }
}

async function getAIAnalysisSummary(prediction, winningNumbers) {
  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: "You are a lottery analysis expert. Evaluate the performance of the provided prediction set against the actual winning numbers and provide a concise, 1-2 sentence strategic evaluation.",
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

  return new Promise((resolve) => {
    agent.subscribe((event) => {
      if (event.type === 'agent_end') {
        const messages = agent.state.messages;
        const lastMessage = messages[messages.length - 1];
        const text = lastMessage.content
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('');
        resolve(text.trim());
      }
    });

    agent.prompt(`Evaluate this prediction against the draw results.
    Prediction Sets: ${JSON.stringify(prediction.predicted_sets)}
    Actual Draw Numbers: ${JSON.stringify(winningNumbers)}
    Provide a brief strategic summary of the performance.`);
  });
}

async function fetchAnalysisData() {
  const stats = await syncAndGetStats();
  const activeRulesObj = await getActiveRules();
  return { stats, activeRulesObj };
}

function setupAgent(activeRulesObj) {
  const systemPrompt = `${analysisSystemInstruction}\nACTIVE OBSERVED RULES:\n${JSON.stringify(activeRulesObj, null, 2)}`;
  
  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: systemPrompt,
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

  return agent;
}

async function handleAgentCompletion(agent, stats) {
  try {
    const messages = agent.state.messages;
    console.log('DEBUG: Agent messages count:', messages.length);
    if (messages.length === 0) {
        throw new Error('Agent messages are empty.');
    }
    
    // Save raw messages to scrapbook for debugging
    await writeToScrapbook(messages);
    
    const lastMessage = messages[messages.length - 1];
    const accumulatedText = lastMessage.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');
    console.log('DEBUG: Accumulated agent output:', accumulatedText);  
    const firstBrace = accumulatedText.indexOf('{');
    const lastBrace = accumulatedText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in output');
    }
    
    const jsonString = accumulatedText.substring(firstBrace, lastBrace + 1);
    
    let parsed = JSON.parse(jsonString);
    console.log('DEBUG: Parsed JSON:', JSON.stringify(parsed, null, 2));
    
    // Strict validation: Expect the full schema
    if (!parsed.okf_journal_draft || !Array.isArray(parsed.okf_journal_draft.rule_updates)) {
      console.error('DEBUG: Validation failed. Structure:', {
          hasJournalDraft: !!parsed.okf_journal_draft,
          ruleUpdatesArray: parsed.okf_journal_draft ? Array.isArray(parsed.okf_journal_draft.rule_updates) : 'N/A'
      });
      throw new Error('Invalid JSON structure: okf_journal_draft.rule_updates must be an array.');
    }
    
    await validateAgentResponse(parsed);
    
    if (parsed.okf_journal_draft) {
      await appendToJournal(parsed.okf_journal_draft);
      if (parsed.okf_journal_draft.rule_updates) {
        await updateRulesFile(parsed.okf_journal_draft.rule_updates);
      }
      
      await LottoMetadata.findOneAndUpdate(
        {},
        { 
          $set: { 
            lastUpdated: new Date(),
            totalRecords: stats.totalRecords,
            latestResult: stats.latestResult,
            analysis: {
              summary: parsed.okf_journal_draft.summary,
              lastAnalyzed: new Date()
            }
          }
        },
        { upsert: true }
      );
      console.log('✅ Analysis completed and saved.');
    }
  } catch (jsonErr) {
    console.error('Failed to parse agent output for persistence:', jsonErr);
  }
}
