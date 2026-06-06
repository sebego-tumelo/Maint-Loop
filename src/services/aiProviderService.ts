import { ollamaService, type ChatMessagePayload } from './ollamaService';
import { huggingFaceService } from './huggingFaceService';

export const aiProviderService = {
  /**
   * Routes the conversation context array directly to the active provider's SDK module.
   */
  async generateChatResponse(
    provider: string,
    model: string,
    messages: ChatMessagePayload[],
    apiKey?: string,
    cloudOllamaUrl?: string
  ): Promise<string> {
    
    switch (provider) {
      case 'Ollama':
        // Passes both credentials and remote endpoint target values down to the SDK
        return await ollamaService.chat(model, messages, cloudOllamaUrl, apiKey);
        
      case 'Hugging Face':
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('An API token is required to make cloud requests via Hugging Face.');
        }
        return await huggingFaceService.chat(model, messages, apiKey);
        
      default:
        throw new Error(`Unsupported AI Engine Provider context: "${provider}"`);
    }
  }
};