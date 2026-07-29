// server.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';

// Import our newly separated lottery workflow engine
import { predictionToolsList, lotterySystemInstruction } from './prediction_workflow.js';

dotenv.config();
const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the frontend/dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ==========================================
// GEMMA 4 CLOUD MODEL REFERENCE BLOCK
// ==========================================
const gemmaCloudModel = {
  id: process.env.OLLAMA_MODEL || 'gemma4:31b',
  name: 'Gemma 4 Cloud Engine',
  api: 'openai-completions',
  provider: 'ollama-cloud',
  baseUrl: 'https://ollama.com/v1',
  reasoning: true, // Native reasoning capabilities enabled
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 256000,
  maxTokens: 8192,
};

// ==========================================
// UNIVERSAL API ENDPOINT
// ==========================================
app.post('/run-instruction', async (req, res) => {
  console.log(`[DEBUG]: Received ${req.method} request to ${req.url}`);
  console.log(`[DEBUG]: Request Body:`, JSON.stringify(req.body));
  const instruction = req.body.instruction;
  
  if (!instruction) {
    console.log(`[DEBUG]: Missing instruction`);
    return res.status(400).json({ error: "Missing 'instruction' property in request body." });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    const agent = new Agent({
      initialState: {
        model: gemmaCloudModel,
        systemPrompt: lotterySystemInstruction,
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

    let lastSentIndex = -1;
    let lastProcessedTextLength = 0;

    agent.subscribe(async (event) => {
      // Send message updates as they come in
      
      if (event.type === 'message_start') {
        lastSentIndex = -1;
        lastProcessedTextLength = 0;
      }
      
      if (event.type === 'message_update') {
        const content = event.message.content;
        
        // Iterate through all content blocks to ensure we don't miss anything
        for (let i = 0; i < content.length; i++) {
          const part = content[i];
          if (part.type === 'text') {
            const textToProcess = part.text || '';
            // Only send the *new* part of this specific text block
            const newText = textToProcess.substring(lastProcessedTextLength);
            
            if (newText.length > 0) {
              const payload = `data: ${JSON.stringify({ type: 'token', text: newText })}\n\n`;
              res.write(payload);
              if (res.flush) res.flush();
              lastProcessedTextLength += newText.length;
            }
          }
        }
      }
      
      if (event.type === 'agent_end') {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    });

    await agent.prompt(instruction);

  } catch (error) {
    console.error('❌ CRITICAL: Pi Agent Core Error Stack:', error.stack);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Proxy endpoint for chat requests
app.post('/chat-proxy', async (req, res) => {
  const { provider, model, messages, apiKey, cloudOllamaUrl } = req.body;
  
  // Forward request based on provider
  try {
    let response;
    if (provider === 'Ollama') {
        // Implement Ollama forwarding logic
        // This would use the cloudOllamaUrl and apiKey
        res.status(501).json({ error: "Ollama proxy not yet fully implemented" });
        return;
    } else {
        // Assume Hugging Face or other
        res.status(501).json({ error: "Provider proxy not yet fully implemented" });
        return;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint for model validation
app.post('/validate-model', async (req, res) => {
  const { provider, tag, apiKey, cloudOllamaUrl } = req.body;
  // Implement validation logic
  res.status(501).json({ valid: false, error: "Validation not yet fully implemented" });
});

import { LottoMetadata } from './models/LottoMetadata.js';

async function syncAndGetStats() {
  const apiBaseUrl = process.env.LOTTERY_API_BASE_URL || 'http://localhost:3000';
  
  // 1. Check if we have recent data (e.g., less than 24 hours old)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cached = await LottoMetadata.findOne({ lastUpdated: { $gte: oneDayAgo } });

  if (cached) {
    return {
      totalRecords: cached.totalRecords,
      yearsProcessed: cached.yearsProcessed,
      latestResult: cached.latestResult,
      lastUpdated: cached.lastUpdated
    };
  }

  // 2. Fetch fresh data
  const response = await fetch(`${apiBaseUrl}/api/results`);
  if (!response.ok) throw new Error('Failed to fetch results');
  const result = await response.json();
  const data = result.data || [];

  // 3. Prepare metadata
  const totalRecords = data.length;
  // Assuming data is sorted by date, or we sort it
  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestResult = sortedData[0] || { date: 'N/A', numbers: [] };
  
  // Calculate years
  const yearsProcessed = [...new Set(data.map(item => new Date(item.date).getFullYear()))].sort();

  // 4. Persist
  const metadata = await LottoMetadata.findOneAndUpdate(
    {},
    { lastUpdated: new Date(), totalRecords, yearsProcessed, latestResult },
    { upsert: true, returnDocument: 'after' }
  );

  return {
    totalRecords: metadata.totalRecords,
    yearsProcessed: metadata.yearsProcessed,
    latestResult: metadata.latestResult,
    lastUpdated: metadata.lastUpdated
  };
}

async function scrapeAndGetStats() {
  const apiBaseUrl = process.env.LOTTERY_API_BASE_URL || 'http://localhost:3000';
  
  // Fetch fresh data
  const response = await fetch(`${apiBaseUrl}/api/results`);
  if (!response.ok) throw new Error('Failed to fetch results');
  const result = await response.json();
  const data = result.data || [];

  // Prepare metadata
  const totalRecords = data.length;
  // Assuming data is sorted by date, or we sort it
  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestResult = sortedData[0] || { date: 'N/A', numbers: [] };
  
  // Calculate years
  const yearsProcessed = [...new Set(data.map(item => new Date(item.date).getFullYear()))].sort();

  // Persist
  const metadata = await LottoMetadata.findOneAndUpdate(
    {},
    { lastUpdated: new Date(), totalRecords, yearsProcessed, latestResult },
    { upsert: true, returnDocument: 'after' }
  );

  return {
    totalRecords: metadata.totalRecords,
    yearsProcessed: metadata.yearsProcessed,
    latestResult: metadata.latestResult,
    lastUpdated: metadata.lastUpdated
  };
}

// 5. API Endpoints
app.get('/api/stats', async (req, res) => {
  try {
    console.log(`[DEBUG]: Received ${req.method} request to ${req.url}`);
    const stats = await syncAndGetStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  try {
    console.log(`[DEBUG]: Received ${req.method} request to ${req.url}`);
    const stats = await scrapeAndGetStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// For any other path, serve the index.html file (for Vue Router SPA)
app.get(/.*/, (req, res) => {                                                                                                               
     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));                                                                        
   });  

// Database Connectivity Initialization Hook
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(3000, () => console.log('Server running on port 3000')))
  .catch(err => console.error(err));
