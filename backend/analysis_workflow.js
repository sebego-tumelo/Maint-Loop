import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { LottoMetadata } from './models/LottoMetadata.js';
import { syncAndGetStats } from './utils.js';
import { 
  analysisSystemInstruction, 
  getActiveRules, 
  appendToJournal, 
  updateRulesFile 
} from './prediction_workflow.js';
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
    
    let parsed = JSON.parse(jsonString);
    
    if (!parsed.okf_journal_draft && parsed.rule_id) {
      console.warn('Agent returned partial rule update, wrapping in schema.');
      const summary = parsed.justification || 'Automated rule update based on dataset analysis.';
      parsed = {
        okf_journal_draft: {
          entry_type: "RULE_MUTATION",
          summary: summary,
          rule_updates: [parsed]
        }
      };
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
