import { Handler } from '@netlify/functions';
import { HfInference } from '@huggingface/inference';

export const handler: Handler = async (event) => {
  // Enforce handling pre-flight CORS prechecks cleanly
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
    const { provider, model, messages } = JSON.parse(event.body || '{}');

    // Securely pull tokens from Netlify Environment variables instead of front-end state
    const hfToken = process.env.HF_API_KEY; 
    
    if (provider === 'Hugging Face') {
      const hf = new HfInference(hfToken);
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

    return { statusCode: 400, body: 'Unsupported provider configuration.' };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};