import { db } from '../db.js';

// Dynamically calculate the development backend port using the active browser location.
// This prevents hardcoded workspace URLs from breaking when your container restarts!
const getBackendBase = () => {
  if (import.meta.env.DEV) {
    const currentHost = window.location.hostname; // e.g., congenial-goldfish-979gx49gwp44f75qp-5173.app.github.dev
    const devBackendHost = currentHost.replace('-5173.', '-5000.');
    return `https://${devBackendHost}/.netlify/functions/api`;
  }
  return '/.netlify/functions/api';
};

const BACKEND_BASE = getBackendBase();

export const aiProviderService = {

  /**
   * Reads an open server stream line-by-line and feeds tokens back to the UI in real time
   * @param {string} provider - The AI provider name (e.g., 'Ollama', 'Hugging Face')
   * @param {string} model - The model name
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunkReceived - Callback function for each text chunk received
   * @returns {Promise<void>}
   */
  async generateChatResponse(provider, model, messages, onChunkReceived) {
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

     // Set up a stream reader to process incoming network buffer bytes
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('Failed to bind text decoder body stream stream reader.');

    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Decode binary packet chunk back into raw text
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Save incomplete lines back into the buffer processing block
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
        
        const dataPayload = cleanLine.replace('data: ', '');
        if (dataPayload === '[DONE]') {
          return; // Stream ended cleanly
        }
        try {
          const parsed = JSON.parse(dataPayload);
          if (parsed.error) throw new Error(parsed.error);
          
          // 🌟 Push the single word/character straight to the UI callback handler!
          onChunkReceived(parsed.text);
        } catch (e) {
          console.error('Error parsing stream packet segment:', e);
        }
      }
    }
    } catch (error) {
      console.error('Routing communication failure:', error);
      throw new Error(error.message || 'Failed to capture cloud response.');
    }
  },

  /**
   * Dispatches validation details from the client down to the api.js backend
   * @param {string} provider - The AI provider name
   * @param {string} tag - The model tag to validate
   * @returns {Promise<{valid: boolean, error?: string}>} Validation result
   */
  async validateModelTag(provider, tag) {
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

      return await response.json(); // Returns { valid: true }
    } catch (error) {
      console.error('Validation communications failure:', error);
      return { valid: false, error: error.message || 'Network interface error.' };
    }
  }
};
