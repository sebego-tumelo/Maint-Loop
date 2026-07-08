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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
  const instruction = req.body.instruction;
  
  if (!instruction) {
    return res.status(400).json({ error: "Missing 'instruction' property in request body." });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
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

    agent.subscribe(async (event) => {
      // Send message updates as they come in
      if (event.type === 'message_update') {
        const content = event.message.content;
        if (Array.isArray(content)) {
          const latestContent = content[content.length - 1];
          if (latestContent.type === 'text') {
            res.write(`data: ${JSON.stringify({ type: 'token', text: latestContent.text })}\n\n`);
          }
        }
      }
      
      if (event.type === 'message_end') {
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

// For any other path, serve the index.html file (for Vue Router SPA)
app.get(/.*/, (req, res) => {                                                                                                               
     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));                                                                        
   });  

// Database Connectivity Initialization Hook
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(3000, () => console.log('Server running on port 3000')))
  .catch(err => console.error(err));