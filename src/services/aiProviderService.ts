import { db } from '../db';

export const aiProviderService = {
  /**
   * Captures conversation states, retrieves locally managed credentials, and routes them through the local proxy.
   */
  async generateChatResponse(provider: string, model: string, messages: any[]): Promise<string> {
    try {
      // 1. Fetch the user's customized credentials right out of local database memory
      const endpointRecord = await db.secureConfig.get('ollama_endpoint');
      const targetKeyConfig = provider === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
      const keyRecord = await db.secureConfig.get(targetKeyConfig);

      const apiKey = keyRecord ? keyRecord.value : '';
      const cloudOllamaUrl = endpointRecord ? endpointRecord.value : '';

      // 2. Pass everything into our unified proxy route
      const response = await fetch('/.netlify/functions/chat-proxy', {
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
        const errorMsg = await response.text();
        throw new Error(`Serverless Proxy Error: ${errorMsg}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error: any) {
      console.error('Routing communication failure:', error);
      throw new Error(error.message || 'Failed to capture cloud model completion response.');
    }
  }
};