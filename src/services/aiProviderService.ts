import { db } from '../db';

// Safely point to your Express container target when inside Codespaces development mode
const BACKEND_BASE = import.meta.env.DEV 
  ? 'https://congenial-goldfish-979gx49gwp44f75qp-5000.app.github.dev/.netlify/functions/api' 
  : '/.netlify/functions/api';

export const aiProviderService = {
  async generateChatResponse(provider: string, model: string, messages: any[]): Promise<string> {
    try {
        console.log('Generating chat response with provider:', provider, 'model:', model);
      const endpointRecord = await db.secureConfig.get('ollama_endpoint');
      const targetKeyConfig = provider === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
      const keyRecord = await db.secureConfig.get(targetKeyConfig);

      const apiKey = keyRecord ? keyRecord.value : '';
      const cloudOllamaUrl = endpointRecord ? endpointRecord.value : '';

      const response = await fetch(`${BACKEND_BASE}/chat-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider, 
          model, 
          messages, 
          apiKey, 
          cloudOllamaUrl 
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        console.log(errText)
        throw new Error(errText || 'Connection failed.');
      }

      const data = await response.json();
      return data.text;
    } catch (error: any) {
      console.error('Routing communication failure:', error);
      throw new Error(error.message || 'Failed to capture cloud response.');
    }
  },

   /**
   * Dispatches validation details from the client down to the api.ts backend
   */
  async validateModelTag(provider: string, tag: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const endpointRecord = await db.secureConfig.get('ollama_endpoint');
      const targetKeyConfig = provider === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
      const keyRecord = await db.secureConfig.get(targetKeyConfig);

      const apiKey = keyRecord ? keyRecord.value : '';
      const cloudOllamaUrl = endpointRecord ? endpointRecord.value : '';

      const response = await fetch(`${BACKEND_BASE}/validate-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          tag,
          apiKey,
          cloudOllamaUrl
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { valid: false, error: errData.error || 'Validation request failed.' };
      }

      return await response.json(); // Returns { valid: true } [cite: 187]
    } catch (error: any) {
      console.error('Validation communications failure:', error);
      return { valid: false, error: error.message || 'Network interface error.' };
    }
  }
};