import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prediction } from '../models/Prediction.js';
import { DrawResult } from '../models/DrawResult.js';
import { appendToJournal } from '../okf_utils.js';
import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

// Re-using the same AI evaluation logic
async function getAIAnalysisSummary(prediction, winningNumbers, bestPoolMatch) {
  const agent = new Agent({
    initialState: {
      model: gemmaCloudModel,
      systemPrompt: `You are a lottery analysis expert. Evaluate the performance of the provided prediction set against the actual winning numbers.
      
      CRITICAL: You generated a pool of candidates. Analyze if any of the candidates in your unselected pool performed better than the sets you finally selected. Identify 'missed opportunities'.
      
      Provide a concise, 1-2 sentence strategic evaluation.`,
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
    Selected Sets Performance: ${JSON.stringify(prediction.predicted_sets.map(s => s.numbers))}
    Best Set from Generated Candidate Pool (Missed Opportunity Analysis): ${JSON.stringify(bestPoolMatch)}
    Actual Draw Numbers: ${JSON.stringify(winningNumbers)}
    
    If the best set in the candidate pool performed better than your selected sets, explain why you missed it in your rationale.`);
  });
}

async function runPostMortem(dateStr) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`--- RUNNING POST-MORTEM FOR: ${dateStr} ---`);

    const prediction = await Prediction.findOne({ draw_date: dateStr });
    if (!prediction) {
      console.error(`❌ No prediction found for: ${dateStr}`);
      return;
    }

    const start = new Date(dateStr);
    const end = new Date(dateStr);
    end.setDate(end.getDate() + 1);
    const drawResult = await DrawResult.findOne({ drawTime: { $gte: start, $lt: end } });
    if (!drawResult) {
      console.error(`❌ No draw result found for: ${dateStr}`);
      return;
    }

    const winningNumbers = drawResult.winNums.map(n => parseInt(n.winNum));

    // Calculate best pool match
    const pool = prediction.candidate_pool || [];
    const getMatches = (comb) => comb.filter(n => winningNumbers.includes(n));
    
    const poolResults = pool.map(cand => ({
        combination: cand.combination,
        match_count: getMatches(cand.combination).length
    }));
    const bestPoolMatch = poolResults.reduce((prev, curr) => (curr.match_count > prev.match_count ? curr : prev), {match_count: 0});

    console.log('Generating AI Analysis...');
    const summary = await getAIAnalysisSummary(prediction, winningNumbers, bestPoolMatch);
    
    console.log('\n--- AI SUMMARY ---');
    console.log(summary);

    await appendToJournal({
      entry_type: "POST_MORTEM_EVALUATION",
      draw_date: dateStr,
      summary: summary,
      best_pool_match: bestPoolMatch
    });

    console.log(`\n✅ Post-mortem journaled for ${dateStr}.`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Post-mortem failed:', err);
  }
}

const args = process.argv.slice(2);
const dateIdx = args.indexOf('--date');
const dateStr = dateIdx !== -1 ? args[dateIdx + 1] : new Date().toISOString().split('T')[0];

runPostMortem(dateStr);
