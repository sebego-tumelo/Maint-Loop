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
// AGENT ORCHESTRATOR RUNTIME RUNNER
// ==========================================
async function runAgentOrchestrator(userInstruction) {
  console.log(`[Engine Activation]: Initializing Pi Agent loop for prompt: "${userInstruction}"`);

  // Track the full textual stream produced across all agent turns
  let finalResponseText = '';

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

    // Keep active operational terminal streaming active
    agent.subscribe(async (event) => {
      if (event.type === 'message_update') return;

      console.log(`📡 [Pi Raw Event Stream]: Received type -> "${event.type}"`);
      
      if (event.type === 'tool_execution_start') {
        console.log(`🔧 [Pi Tool Action]: Executing -> ${event.toolName}`);
      }

      if (event.type === 'message_end' && event.message) {
        const contentData = event.message.content;

        // Print context if it's the model's turn to speak
        if (event.message.role === 'assistant' && Array.isArray(contentData)) {
          console.log(`\n================================================================`);
          console.log(`🧠 [GEMMA 4 STRATEGIC ANALYSIS & REASONING PIPELINE]:`);
          console.log(`================================================================`);

          

          contentData.forEach(block => {
            // Log reasoning paths or text tokens output by the model
            if (block.type === 'text') {
              finalResponseText += block.text + '\n';
            }
          });

          // Print the formatted response text (contains strategies and JSON)
          console.log(finalResponseText.trim());
          console.log(`================================================================\n`);
          
        }
      }
    });

    console.log(`[Engine Activation]: Routing analytical pipeline to cloud provider...`);
    await agent.prompt(userInstruction);
    console.log(`[Engine Success]: Pi Agent prediction cycle finalized.`);

    // Return the total textual reasoning and JSON payload back to the route handler
    return finalResponseText.trim();

  } catch (error) {
    console.error('❌ CRITICAL: Pi Agent Core Error Stack:', error.stack);
  }
}

// ==========================================
// UNIVERSAL API ENDPOINT
// ==========================================
app.post('/run-instruction', async (req, res) => {
  try {
    const instruction = req.body.instruction;
    
    if (!instruction) {
      return res.status(400).json({ error: "Missing 'instruction' property in request body." });
    }

    // Await the complete generation cycle of consecutive reasoning phases + final ticket block
    const resultPayload = await runAgentOrchestrator(instruction);

    // Return the response as a clean plain text block containing markdown reasoning and the JSON ticket
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(resultPayload);

  } catch (error) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to complete agent execution pipeline.',
      details: error.message 
    });
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