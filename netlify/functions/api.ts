import express, { Request, Response, Router } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { HfInference } from '@huggingface/inference';
import { Ollama } from 'ollama';

const app = express();
const router = Router();

// Configure CORS to accept development queries from Vite seamlessly
app.use(cors());
app.use(express.json());

/**
 * Single Unified Chat Completion Routing Pipeline
 */
router.post('/chat-proxy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider, model, messages, apiKey, cloudOllamaUrl } = req.body;

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
        console.log('Received request for Ollama with model:', model);
      const targetUrl = cloudOllamaUrl || 'https://your-cloud-ollama-node.com';
      
      const ollama = new Ollama({
        host: targetUrl,
        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
      });

      const response = await ollama.chat({
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
