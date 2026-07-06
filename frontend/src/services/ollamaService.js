import { Ollama } from 'ollama';

/**
 * @typedef {Object} ChatMessagePayload
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 */

export const ollamaService = {
  /**
   * Fires chat completion routines against a remote, cloud-hosted Ollama server instance.
   * @param {string} model - The model name
   * @param {ChatMessagePayload[]} messages - Array of message objects
   * @param {string} [cloudEndpoint] - Custom Ollama endpoint URL
   * @param {string} [apiKey] - Optional API key for authentication
   * @returns {Promise<string>} The response text from the model
   */
  async chat(
    model,
    messages,
    cloudEndpoint,
    apiKey
  ) {
    
    // Fall back gracefully if configuration details are completely missing
    const targetUrl = cloudEndpoint || 'https://your-default-cloud-ollama-node.com';

    // Construct the authenticated cloud configuration instance
    const ollama = new Ollama({
      host: targetUrl,
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
    });

    try {
      const response = await ollama.chat({
        model: model.toLowerCase().replace(/\s+/g, ''), // Formats e.g. "Gemma 4 12B" to "gemma4:12b" syntax
        messages: messages,
        stream: false // Matches our structural database layout
      });

      return response.message?.content || 'Empty response returned from cloud instance.';
    } catch (error) {
      console.error('Ollama cloud SDK runtime error:', error);
      throw new Error(`Cloud Ollama exception: ${error.message}`);
    }
  }
};
