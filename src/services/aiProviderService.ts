export const aiProviderService = {
  async generateChatResponse(provider: string, model: string, messages: any[]): Promise<string> {
    try {
      // Calls your own domain route endpoint seamlessly
      const response = await fetch('/.netlify/functions/chat-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages })
      });

      if (!response.ok) {
        throw new Error('Network proxy error occurred.');
      }

      const data = await response.json();
      return data.text;
    } catch (error: any) {
      throw new Error(`Proxy Routing Failed: ${error.message}`);
    }
  }
};