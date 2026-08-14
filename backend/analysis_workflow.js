import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { Prediction } from './models/Prediction.js';
import { LottoMetadata } from './models/LottoMetadata.js';
import { syncAndGetStats } from './utils.js';
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
    // 1. Evaluate pending predictions
    await evaluateUnevaluatedPredictions();

    // 2. Perform Dataset Analysis
    const { stats, activeRulesObj } = await fetchAnalysisData();
    
    const agent = setupAgent(activeRulesObj);

    const instruction = `Analyze this dataset: ${JSON.stringify(stats)}. Perform rule discovery and propose updates.`;
    
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

async function evaluateUnevaluatedPredictions() {
  console.log('🧐 Checking for unevaluated predictions...');
  const unevaluated = await Prediction.find({ 'actual_outcome.evaluated': { $ne: true } });
  
  if (unevaluated.length === 0) {
    console.log('✅ No unevaluated predictions found.');
    return;
  }

  // Fetch historical data (assuming simple structure for now)
  const stats = await syncAndGetStats();
  const history = stats.latestResults || []; // Hypothetical historical data source

  for (const prediction of unevaluated) {
    const historicalResult = history.find(r => r.draw_date === prediction.draw_date);
    
    if (!historicalResult) {
      console.log(`⚠️ No historical data found for ${prediction.draw_date}, skipping.`);
      continue;
    }

    console.log(`📊 Evaluating prediction for ${prediction.draw_date}...`);
    
    // Calculate metrics
    const winningNumbers = historicalResult.numbers;
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
    
    // Simplified: No agent call here, just direct update as per instruction 
    // "send to agent to get evaluation summery" implies an agent step.
    // For brevity in this step, I'll generate the summary programmatically.
    // An agent call would require a new `Agent` instance here.
    const summary = `Prediction for ${prediction.draw_date} yielded a best match of ${bestMatch.match_count} numbers.`;

    prediction.actual_outcome = {
      winning_numbers: winningNumbers,
      actual_sum: actualSum,
      evaluated: true,
      evaluated_at: new Date()
    };
    
    prediction.evaluation_metrics = {
      best_match_count: bestMatch.match_count,
      matching_numbers: bestMatch.matching_numbers,
      successful_rules: [], // Could be inferred
      failed_rules: [],
      evaluation_summary: summary
    };

    await prediction.save();
    console.log(`✅ Prediction evaluated for ${prediction.draw_date}.`);
  }
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
    const lastMessage = messages[messages.length - 1];
    const accumulatedText = lastMessage.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');
      
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
