import { HfInference } from '@huggingface/inference';

export const huggingFaceService = {
  /**
   * Resolves conversational styling labels to official Hugging Face Hub Repositories.
   * @param {string} modelLabel - The display label for the model
   * @returns {string} The Hugging Face model repository ID
   */
  resolveModelRepo(modelLabel) {
    switch (modelLabel) {
      case 'Llama 3 8B Instruct':
        return 'meta-llama/Meta-Llama-3-8B-Instruct';
      case 'Mistral 7B v0.3':
        return 'mistralai/Mistral-7B-Instruct-v0.3';
      case 'Phi-3 Medium':
        return 'microsoft/Phi-3-medium-4k-instruct';
      default:
        return 'meta-llama/Meta-Llama-3-8B-Instruct';
    }
  },

  /**
   * Submits requests to Hugging Face serverless execution containers using the official client library.
   * @param {string} modelLabel - The display label for the model
   * @param {Array} messages - Array of message objects with role and content
   * @param {string} apiKey - Hugging Face API key
   * @returns {Promise<string>} The generated text response
   */
  async chat(
    modelLabel,
    messages,
    apiKey
  ) {
    if (!apiKey) {
      throw new Error('Hugging Face authentication key is missing or undefined.');
    }

    // Initialize the official client tracking wrapper
    const hf = new HfInference(apiKey);
    const repoId = this.resolveModelRepo(modelLabel);

    try {
      // Map message lists down to a standard conversational history block
      const promptText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';

      const response = await hf.textGeneration({
        model: repoId,
        inputs: promptText,
        parameters: {
          max_new_tokens: 512,
          return_full_text: false
        }
      });

      return response.generated_text?.trim() || 'Empty response content received.';
    } catch (error) {
      console.error('Hugging Face client runtime error:', error);
      throw new Error(`Hugging Face API failed: ${error.message}`);
    }
  }
};
