import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { LottoMetadata } from './models/LottoMetadata.js';
import { syncAndGetStats } from './utils.js';
import { 
  getActiveRules, 
  appendToJournal, 
  updateRulesFile 
} from './okf_utils.js';
import { writeFile } from 'fs/promises';

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
    const { stats, activeRulesObj } = await fetchAnalysisData();
    
    const agent = setupAgent(activeRulesObj);

    const instruction = `Analyze this dataset: ${JSON.stringify(stats)}. Perform rule discovery and propose updates.`;
    
    let accumulatedText = '';
    agent.subscribe(async (event) => {
      if (event.type === 'message_update') {
        const content = event.message.content;
        for (const part of content) {
          if (part.type === 'text') accumulatedText += part.text;
        }
      }
      
      if (event.type === 'agent_end') {
        await handleAgentCompletion(accumulatedText, stats);
      }
    });

    await agent.prompt(instruction);

  } catch (error) {
    console.error('❌ Error during AI analysis:', error);
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

async function handleAgentCompletion(accumulatedText, stats) {
  try {
    const matches = [...accumulatedText.matchAll(/\{[\s\S]*?\}/g)];
    const lastMatch = matches[matches.length - 1];
    
    if (!lastMatch) {
      throw new Error('No JSON found in output');
    }
    
    const jsonString = lastMatch[0];
    
    await writeFile('agent_res.txt', accumulatedText);
    
    let parsed = JSON.parse(jsonString);
    
    // Strict validation: Expect the full schema
    if (!parsed.okf_journal_draft || !Array.isArray(parsed.okf_journal_draft.rule_updates)) {
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
