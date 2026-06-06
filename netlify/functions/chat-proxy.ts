import { Handler } from '@netlify/functions';
import { HfInference } from '@huggingface/inference';

export const handler: Handler = async (event) => {
  // Cleanly handle browser CORS preflight checks
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // The frontend now passes the dynamic user-defined key inside the payload body
    const { provider, model, messages, apiKey, cloudOllamaUrl } = JSON.parse(event.body || '{}');

    if (provider === 'Hugging Face') {
      if (!apiKey) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No Hugging Face token provided by the application.' }) };
      }

      const hf = new HfInference(apiKey);
      const promptText = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';

      const response = await hf.textGeneration({
        model: model,
        inputs: promptText,
        parameters: { max_new_tokens: 512, return_full_text: false }
      });

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ text: response.generated_text?.trim() })
      };
    }

    // Dynamic routing for your Cloud-hosted Ollama endpoints
    if (provider === 'Ollama') {
      const targetUrl = cloudOllamaUrl || 'https://your-cloud-ollama-node.com';
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(`${targetUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model.toLowerCase().replace(/\s+/g, ''),
          messages,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama Cloud instance responded with status ${response.status}`);
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ text: data.message?.content || '' })
      };
    }

    return { statusCode: 400, body: 'Unsupported provider configuration.' };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};