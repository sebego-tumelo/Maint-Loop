import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';

import { 
  predictionToolsList, 
  predictionSystemInstruction,
} from './prediction_workflow.js';
import { 
  appendToJournal,
  updateRulesFile,
  getActiveRules
} from './okf_utils.js';
import { syncAndGetStats } from './utils.js';
import { runAnalysis, analysisSystemInstruction } from './analysis_workflow.js';

dotenv.config();
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.use(express.static(path.join(__dirname, '../frontend/dist')));

const gemmaCloudModel = {
  id: process.env.OLLAMA_MODEL || 'gemma4:31b',
  name: 'Gemma 4 Cloud Engine',
  api: 'openai-completions',
  provider: 'ollama-cloud',
  baseUrl: 'https://ollama.com/v1',
  reasoning: true,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 256000,
  maxTokens: 8192,
};

app.post('/run-instruction', async (req, res) => {
  const { instruction, mode = 'MODE_B_PREDICT' } = req.body;
  
  if (!instruction) {
    return res.status(400).json({ error: "Missing 'instruction' property in request body." });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    const activeRulesObj = await getActiveRules();
    const systemPrompt = mode === 'MODE_A_ANALYZE' 
      ? `${analysisSystemInstruction}\nACTIVE OBSERVED RULES:\n${JSON.stringify(activeRulesObj, null, 2)}`
      : `${predictionSystemInstruction}\nACTIVE OBSERVED RULES:\n${JSON.stringify(activeRulesObj, null, 2)}`;

    const agent = new Agent({
      initialState: {
        model: gemmaCloudModel,
        systemPrompt: systemPrompt,
        tools: predictionToolsList,
        messages: [],
      }
    });

    agent.streamFn = (model, context, options) => {
      return streamSimple(model, context, {
        ...options,
        apiKey: process.env.OLLAMA_API_KEY,
        headers: {
          'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`
        }
      });
    };

    let accumulatedText = '';

    agent.subscribe(async (event) => {
      if (event.type === 'message_update') {
        const content = event.message.content;
        for (const part of content) {
          if (part.type === 'text') {
            const newChunk = part.text.substring(accumulatedText.length);
            if (newChunk.length > 0) {
              accumulatedText += newChunk;
              res.write(`data: ${JSON.stringify({ type: 'token', text: newChunk })}\n\n`);
              if (res.flush) res.flush();
            }
          }
        }
      }
      
      if (event.type === 'agent_end') {
        try {
          const parsed = JSON.parse(accumulatedText);
          if (parsed.okf_journal_draft) {
            await appendToJournal(parsed.okf_journal_draft);
            if (parsed.okf_journal_draft.rule_updates) {
              await updateRulesFile(parsed.okf_journal_draft.rule_updates);
            }
          }
        } catch (jsonErr) {
          // Response was standard streamed reasoning text
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    });

    await agent.prompt(instruction);

  } catch (error) {
    console.error('❌ CRITICAL Error:', error.stack);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});



app.get('/api/stats', async (req, res) => {
  try {
    const stats = await syncAndGetStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze-dataset', async (req, res) => {
  console.log('🚀 Initiating dataset analysis...');
  // Fire and forget
  runAnalysis()
    .then(() => console.log('✅ Dataset analysis completed successfully.'))
    .catch(err => console.error('❌ Background analysis failed:', err));
  res.status(202).json({ message: "Dataset analysis initiated" });
});

// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
// });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(3000, () => console.log('Server running on port 3000')))
  .catch(err => console.error(err));