import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { generateUniqueCandidates, scoreAndFilterCandidates } from './candidateGenerator.js';
import { getActiveRules, appendToJournal, OKF_DIR } from './okf_utils.js';
import path from 'path';

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

export async function runPrediction() {
  console.log('🔮 Starting AI-driven prediction synthesis...');
  
  try {
    // 1. Data Preparation (Deterministic)
    const activeRules = await getActiveRules();
    const rulesPath = path.join(OKF_DIR, 'rules.json');
    const rawCandidates = await generateUniqueCandidates(1000);
    const top20 = await scoreAndFilterCandidates(rawCandidates, rulesPath);

    // 2. Setup Agent for Synthesis
    const agent = new Agent({
      initialState: {
        model: gemmaCloudModel,
        systemPrompt: `You are in MODE B: CANDIDATE GENERATOR & PREDICTION SYNTHESIS.
        Select the top 3 sets from the provided top 20 candidates. 
        Draft a journal entry for /okf/journal.md explaining your selection based on: ${JSON.stringify(activeRules)}.
        Return ONLY a JSON object with: { "selected_draws": [...], "journal_entry": "..." }`,
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

    // 3. Prompt Agent
    await agent.prompt(`Analyze these candidates and select the top 3: ${JSON.stringify(top20)}`);
    
    // Extract last message content
    const lastMessage = agent.state.messages[agent.state.messages.length - 1];
    const responseText = lastMessage.content.map(p => p.text).join('');
    
    // 4. Parse and Journal
    const jsonMatch = responseText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    await appendToJournal({
        entry_type: "PREDICTION_SYNTHESIS",
        summary: parsed.journal_entry
    });

    console.log('✅ Prediction synthesis completed.');
    return parsed;
  } catch (error) {
    console.error('❌ Error during AI prediction:', error);
    throw error;
  }
}
