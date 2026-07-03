// server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Agent } from '@mariozechner/pi-agent-core';
import { streamSimple } from '@mariozechner/pi-ai';

// Import our newly separated lottery workflow engine
import { predictionToolsList, lotterySystemInstruction } from './prediction_workflow.js';

dotenv.config();
const app = express();
app.use(express.json());

// ==========================================
// GEMMA 4 CLOUD MODEL REFERENCE BLOCK
// ==========================================
const gemmaCloudModel = {
  id: process.env.OLLAMA_MODEL || 'gemma4:31b', // Updated to gemma4:31b
  name: 'Gemma 4 Cloud Engine',
  api: 'openai-completions',
  provider: 'ollama-cloud',
  baseUrl: 'https://ollama.com/v1',
  reasoning: true, // Native reasoning capabilities enabled
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 256000, // Explicitly taking advantage of the large 256k window
  maxTokens: 8192,
};

// ==========================================
// AGENT ORCHESTRATOR RUNTIME RUNNER
// ==========================================
async function runAgentOrchestrator(userInstruction) {
  console.log(`[Engine Activation]: Initializing Pi Agent loop for prompt: "${userInstruction}"`);

  try {
    const agent = new Agent({
      initialState: {
        model: gemmaCloudModel,
        systemPrompt: lotterySystemInstruction, // Bound from our prediction_workflow module
        tools: predictionToolsList,             // Bound from our prediction_workflow module
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
    
    // Streaming operational telemetry to backend logs
    agent.subscribe(async (event) => {
      
      if (event.type === 'message_update') return;
      
      console.log(`🤖 [Pi Raw Event Stream]: type="${event.type}"`, JSON.stringify(event, null, 2));
      // console.log(`📡 [Pi Raw Event Stream]: Received type -> "${event.type}"`);
      
      if (event.type === 'tool_execution_start') {
        console.log(`🔧 [Pi Tool Action]: Executing -> ${event.toolName}`);
      }
      if (event.type === 'message_end') {
        // Safe unpack for message arrays or text payloads
        const contentData = event.message?.content;
        console.log('🔍 [finish/stop reason]:', event.message?.stopReason ?? 'NOT FOUND');

        if (Array.isArray(contentData)) {
          const textSegments = contentData.filter(c => c.type === 'text').map(c => c.text).join('\n');
          console.log(`📝 [Pi Turn Content/Reasoning Output]:\n`, textSegments);
        } else {
          console.log(`📝 [Pi Turn Content/Reasoning Output]:`, contentData);
        }
      }
    });

    console.log(`[Engine Activation]: Routing analytical pipeline to cloud provider...`);
    await agent.prompt(userInstruction);
    console.log(`[Engine Success]: Pi Agent prediction cycle finalized.`);

  } catch (error) {
    console.error('❌ CRITICAL: Pi Agent Core Error Stack:', error.stack);
  }
}

// ==========================================
// UNIVERSAL API ENDPOINT
// ==========================================
app.post('/run-instruction', (req, res) => {
  const instruction = req.body.instruction;
  res.status(200).json({ status: 'accepted', message: 'Pi Agent processing started.' });
  runAgentOrchestrator(instruction);
});

// Database Connectivity Initialization Hook
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(3000, () => console.log('Server running on port 3000')))
  .catch(err => console.error(err));