import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { HfInference } from '@huggingface/inference';
import ollama, { Ollama } from 'ollama';

const app = express();
const router = express.Router();

// --- DYNAMIC CORS CONFIGURATION ---
// Determines the allowed origin based on the current environment.
// In development/Codespaces, it dynamically accepts the incoming origin.
// In production, it locks access down securely to your live deployment.
const getAllowedOrigin = (requestOrigin) => {
  if (process.env.NODE_ENV !== 'production') {
    return requestOrigin || '*';
  }
  return 'https://mylocalchat.netlify.app';
};

app.use(cors((req, callback) => {
  const incomingOrigin = req.headers.origin;
  callback(null, {
    origin: getAllowedOrigin(incomingOrigin),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-API-Key']
  });
}));

app.use(express.json());

// Dynamic options preflight wildcard catcher to resolve CORS checks safely across paths
app.options('/*path', cors((req, callback) => {
  const incomingOrigin = req.headers.origin;
  callback(null, { 
    origin: getAllowedOrigin(incomingOrigin), 
    credentials: true 
  });
}));

/**
 * Verification Endpoint: Verifies if a custom model tag exists with the provider
 */
router.post('/validate-model', async (req, res) => {
  try {
    const { provider, tag, apiKey, cloudOllamaUrl } = req.body;

    if (!tag) {
      res.status(400).json({ valid: false, error: 'Model tag parameter is required.' });
      return;
    }

    // --- OLLAMA CLOUD INFRASTRUCTURE VALIDATION ---
    if (provider === 'Ollama') {
      const targetUrl = cloudOllamaUrl || 'https://ollama.com';
      const cleanKey = apiKey ? apiKey.trim() : '';

      const headers = { 'Content-Type': 'application/json' };
      if (cleanKey) headers['Authorization'] = `Bearer ${cleanKey}`;

      // Hit the official Ollama verification endpoint
      const checkRes = await fetch(`${targetUrl}/api/show`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: tag })
      });

      if (!checkRes.ok) {
        res.status(404).json({ valid: false, error: `Model tag "${tag}" not found on Ollama.` });
        return;
      }

      res.status(200).json({ valid: true });
      return;
    }

    // --- HUGGING FACE INFERENCE VALIDATION ---
    if (provider === 'Hugging Face') {
      const checkRes = await fetch(`https://huggingface.co/api/models/${tag}`);
      
      if (!checkRes.ok) {
        res.status(404).json({ valid: false, error: `Model "${tag}" not found on Hugging Face Hub.` });
        return;
      }

      res.status(200).json({ valid: true });
      return;
    }

    res.status(400).json({ valid: false, error: 'Unsupported provider engine context.' });
  } catch (error) {
    console.error('Validation Engine Error:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

/**
 * Single Unified Chat Completion Routing Pipeline
 */
router.post('/chat-proxy', async (req, res) => {
  try {
    const { provider, model, messages, apiKey, cloudOllamaUrl } = req.body;

    // Set essential HTTP streaming headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish instant network link line connection

    console.log('Received chat-proxy request with provider:', provider, 'model:', model);
    
    // --- HUGGING FACE INTELLIGENCE PIPELINE ---
    if (provider === 'Hugging Face') {
      if (!apiKey) {
        res.status(400).json({ error: 'Missing Hugging Face authentication token.' });
        res.write(`data: ${JSON.stringify({ error: 'Missing HF Token' })}\n\n`);
        res.end();
        return;
      }

      const hf = new HfInference(apiKey);
      const promptText = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';

      for await (const chunk of hf.textGenerationStream({
        model: model || 'meta-llama/Meta-Llama-3-8B-Instruct',
        inputs: promptText,
        parameters: { max_new_tokens: 512, return_full_text: false }
      })) {
        const textChunk = chunk.token?.text || '';
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // --- OLLAMA CLOUD INFRASTRUCTURE PIPELINE ---
    if (provider === 'Ollama') {
      
      // Fall back to a safe placeholder if no endpoint link was provided in the database settings
      const targetUrl = cloudOllamaUrl || 'https://your-cloud-ollama-node.com';
      const cleanKey = apiKey ? apiKey.trim() : '';

      const headers = {};
      if (cleanKey) {
        headers['Authorization'] = `Bearer ${cleanKey}`;
        headers['X-API-Key'] = cleanKey;
      }

      // Configure a custom instance if a distinct remote cloud node endpoint has been provided
      const ollamaClient = cloudOllamaUrl 
        ? new Ollama({ host: targetUrl, headers: Object.keys(headers).length ? headers : undefined })
        : ollama;

      const responseStream = await ollamaClient.chat({
        model: model, // Passes the exact string intact from your custom tags database (e.g., 'gemma4:31b')
        messages: messages,
        stream: true // Enable streaming for real-time response flow
      });

      // Loop over incoming stream tokens and write directly to the open client link
      for await (const chunk of responseStream) {
        const textChunk = chunk.message?.content || '';
        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.status(400).json({ error: 'Unsupported AI service provider engine context.' });
  } catch (error) {
    console.error('Express Streaming Engine Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Map all endpoints under the Netlify redirect signature route
app.use('/.netlify/functions/api', router);

// PRODUCTION: Export for Netlify Serverless environment
export const handler = serverless(app);

// DEVELOPMENT: Start a local HTTP server if run directly via Node/tsx
if (process.env.NODE_ENV !== 'production') {
  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Local Express backend proxy active on http://localhost:${PORT}`);
    console.log(`🔗 Routing endpoint: http://localhost:${PORT}/.netlify/functions/api/chat-proxy`);
  });
}

//npx tsx netlify/functions/api.js
