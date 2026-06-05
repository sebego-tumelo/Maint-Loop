<template>
  <div 
    class="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-[340px] bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111] animate-fade-in">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold">Model Settings</h3>
        <span 
          v-if="isLocked" 
          class="text-[0.65rem] font-bold bg-[#E75A24] text-white px-2 py-0.5 rounded border border-[#111111] uppercase tracking-wider"
        >
          Locked
        </span>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1">Service Provider</label>
          <div class="relative">
            <select 
              :value="serviceProvider"
              :disabled="isLocked"
              @change="handleServiceChange(($event.target as HTMLSelectElement).value)"
              class="w-full p-2.5 border-[1.5px] border-[#111111] bg-white rounded-lg text-sm font-medium outline-none appearance-none disabled:bg-[#E6DFD3] disabled:text-gray-600 cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="Ollama">Ollama (Local)</option>
              <option value="Hugging Face">Hugging Face (Cloud)</option>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-xs">▼</div>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1">Model Name</label>
          <div class="relative">
            <select 
              :value="modelName"
              :disabled="isLocked"
              @change="$emit('update:modelName', ($event.target as HTMLSelectElement).value)"
              class="w-full p-2.5 border-[1.5px] border-[#111111] bg-white rounded-lg text-sm font-medium outline-none appearance-none disabled:bg-[#E6DFD3] disabled:text-gray-600 cursor-pointer disabled:cursor-not-allowed"
            >
              <option v-for="model in availableModels" :key="model" :value="model">
                {{ model }}
              </option>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-xs">▼</div>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1">System Prompt</label>
          <textarea 
            :value="systemPrompt"
            @input="$emit('update:systemPrompt', ($event.target as HTMLTextAreaElement).value)"
            class="w-full p-2.5 border-[1.5px] border-[#111111] bg-white rounded-lg text-sm h-24 outline-none focus:bg-[#FAFFA0]/20 transition-colors resize-none"
            placeholder="Describe assistant behaviors..."
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelName: string;
  serviceProvider: string;
  systemPrompt: string;
  isLocked: boolean; // Locks dropdown controls if history records are populated
}>();

const emit = defineEmits(['close', 'update:modelName', 'update:serviceProvider', 'update:systemPrompt']);

// Mapping available models depending on the active provider context
const availableModels = computed(() => {
  if (props.serviceProvider === 'Hugging Face') {
    return ['Llama 3 8B Instruct', 'Mistral 7B v0.3', 'Phi-3 Medium'];
  }
  return ['Gemma 4 12B', 'DeepSeek R1 8B', 'Qwen 2.5 7B'];
});

const handleServiceChange = (value: string) => {
  emit('update:serviceProvider', value);
  // Default assign first variant in chosen array to protect alignment values
  if (value === 'Hugging Face') {
    emit('update:modelName', 'Llama 3 8B Instruct');
  } else {
    emit('update:modelName', 'Gemma 4 12B');
  }
};
</script>