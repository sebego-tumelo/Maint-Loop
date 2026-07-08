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
      console.log(`[Backend Event]: ${event.type}`);
      
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
              console.log(`[Backend Token]: Sending "${newText}"`);
              const payload = `data: ${JSON.stringify({ type: 'token', text: newText })}\n\n`;
              res.write(payload);
              if (res.flush) res.flush();
              lastProcessedTextLength += newText.length;
            }
          }
        }
      }
      
      if (event.type === 'agent_end') {
        console.log(`[Backend Event]: Agent work complete. Ending stream.`);
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
