import express, { Request, Response, Router } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { HfInference } from '@huggingface/inference';
import ollama, { Ollama } from 'ollama';

const app = express();
const router = Router();

// 1. Define your exact frontend origin url
const ALLOWED_ORIGIN = 'https://congenial-goldfish-979gx49gwp44f75qp-5173.app.github.dev';

// 2. Configure global CORS settings
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());

// 3. FIX: Handle preflight OPTIONS requests using standard Express 5 wildcard parameters
// The syntax '/:path*' replaces the old system wildcards completely without breaking path-to-regexp
app.options('/*path', cors());

/**
 * Single Unified Chat Completion Routing Pipeline
 */
router.post('/chat-proxy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, model, messages, apiKey, cloudOllamaUrl } = req.body;

    console.log('Received chat-proxy request with provider:', provider, 'model:', model);
    // --- HUGGING FACE INTELLIGENCE PIPELINE ---
    if (provider === 'Hugging Face') {
      if (!apiKey) {
        res.status(400).json({ error: 'Missing Hugging Face authentication token.' });
        return;
      }

      const hf = new HfInference(apiKey);
      const promptText = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';

      const response = await hf.textGeneration({
        model: model || 'meta-llama/Meta-Llama-3-8B-Instruct',
        inputs: promptText,
        parameters: { max_new_tokens: 512, return_full_text: false }
      });

      res.status(200).json({ text: response.generated_text?.trim() || '' });
      return;
    }

    // --- OLLAMA CLOUD INFRASTRUCTURE PIPELINE ---
    if (provider === 'Ollama') {      
      const targetUrl = cloudOllamaUrl || 'https://your-cloud-ollama-node.com';
      
      // Clean up the key string to prevent space characters from breaking headers
      const cleanKey = apiKey ? apiKey.trim() : '';
      
      // Set up a robust header configuration matching remote proxy expectations
      const headers: Record<string, string> = {};
      if (cleanKey) {
        headers['Authorization'] = `Bearer ${cleanKey}`;
        // Fallback option used by some custom cloud inference routers:
        headers['X-API-Key'] = cleanKey; 
      }
    
      // console.log('foo')
      const customOllama = new Ollama({
        host: targetUrl,
        headers: Object.keys(headers).length > 0 ? headers : undefined
      });

      const response = await customOllama.chat({
        model: model.toLowerCase().replace(/\s+/g, ''),
        messages: messages,
        stream: false
      });

      res.status(200).json({ text: response.message?.content || '' });
      return;
    }

    res.status(400).json({ error: 'Unsupported AI service provider engine context.' });
  } catch (error: any) {
    console.error('Express Engine Error:', error);
    res.status(500).json({ error: error.message });
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


