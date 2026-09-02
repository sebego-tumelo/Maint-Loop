import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';
import { Prediction } from './models/Prediction.js';
import { LottoMetadata } from './models/LottoMetadata.js';
import { 
  runPrediction,
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

app.use(cors());
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  console.log(`🌐 [Request] ${req.method} ${req.originalUrl} | IP: ${ip} | User-Agent: ${userAgent}`);
  next();
});
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

  // Handle Mode B Prediction specifically through the module
  if (mode === 'MODE_B_PREDICT') {
    try {
      const result = await runPrediction();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Prediction generation failed' });
    }
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
      : 'Analyze instructions.'; // Fallback for other modes

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



app.get('/api/latest-predictions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const predictions = await Prediction.find()
      .sort({ draw_date: -1 })
      .limit(limit);
    
    res.json({ success: true, count: predictions.length, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/latest-results', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const stats = await syncAndGetStats();
    // Assuming rawDrawHistory is sorted newest-first, otherwise sort it
    const sortedResults = [...stats.rawDrawHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latestResults = sortedResults.slice(0, limit);
    
    res.json({ success: true, count: latestResults.length, data: latestResults });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

app.get('/api/analysis-status', async (req, res) => {
  try {
    const meta = await LottoMetadata.findOne({});
    const lastAnalyzed = meta?.analysis?.lastAnalyzed;
    
    // Determine if analysis is needed:
    // It's needed if there's no previous analysis OR if it's stale (last analyzed before 8 PM today)
    const needsAnalysis = !lastAnalyzed || isStale(lastAnalyzed);
    
    res.json({ success: true, needsAnalysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to check if timestamp is stale
function isStale(timestamp) {
  const lastDate = new Date(timestamp);
  const now = new Date();
  
  // If last analysis was a different day, it's stale
  if (lastDate.toDateString() !== now.toDateString()) {
    return true;
  }
  
  // If last analysis was today but before 8 PM, and now it's after 8 PM, it's stale
  if (lastDate.getHours() < 20 && now.getHours() >= 20) {
    return true;
  }
  
  return false;
}

app.post('/api/analyze-dataset', async (req, res) => {
  console.log('🚀 Initiating dataset analysis...');
  // Fire and forget
  runAnalysis()
    .then(() => console.log('✅ Dataset analysis completed successfully.'))
    .catch(err => console.error('❌ Background analysis failed:', err));
  res.status(202).json({ message: "Dataset analysis initiated" });
});

app.post('/api/predict-draw', async (req, res) => {
  console.log('🔮 Request received: /api/predict-draw');
  const { boardCount } = req.body;
  try {
    const result = await runPrediction(boardCount);
    console.log('✅ Prediction synthesis returned successfully.');
    res.json(result);
  } catch (error) {
    console.error('❌ Error running prediction via /api/predict-draw:', error);
    res.status(500).json({ error: 'Prediction generation failed' });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Helper function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Enhanced helper function to wake up external server (fire-and-forget)
async function wakeUpExternalServer() {
  const url = `${process.env.LOTTERY_API_BASE_URL}/api/wakeup`;
  const maxRetries = 3;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    console.log(`📡 Waking up external server (Attempt ${attempt + 1}/${maxRetries + 1}) at ${url}...`);
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ External server successfully responded: awake.');
        return; // Exit function on success
      } else {
        console.warn(`⚠️ Attempt ${attempt + 1} failed with status: ${response.status}`);
      }
    } catch (err) {
      console.error(`❌ Attempt ${attempt + 1} failed: ${err.message}`);
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Waiting 30 seconds before next attempt...`);
      await sleep(30000);
    }
  }
  
  console.error('❌ Failed to wake up external server after maximum attempts.');
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    
    
    app.listen(3000, () => console.log('Server running on port 3000'));

    // Trigger asynchronously without 'await' to avoid blocking startup
    wakeUpExternalServer();
  })
  .catch(err => console.error(err));
