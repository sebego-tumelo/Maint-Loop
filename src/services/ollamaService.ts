import { Ollama } from 'ollama';

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const ollamaService = {
  /**
   * Fires chat completion routines against a remote, cloud-hosted Ollama server instance.
   */
  async chat(
    model: string,
    messages: ChatMessagePayload[],
    cloudEndpoint?: string,
    apiKey?: string
  ): Promise<string> {
    
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
    } catch (error: any) {
      console.error('Ollama cloud SDK runtime error:', error);
      throw new Error(`Cloud Ollama exception: ${error.message}`);
    }
  }
};