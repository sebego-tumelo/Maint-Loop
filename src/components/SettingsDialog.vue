<template>
  <div 
    class="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="closeAllDropdowns(); $emit('close')"
  >
    <!-- Main Modal Container -->
    <div class="w-full max-w-[340px] bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111] animate-fade-in">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold tracking-tight">Model Settings</h3>
        <span 
          v-if="isLocked" 
          class="text-[0.65rem] font-bold bg-[#E75A24] text-white px-2 py-0.5 rounded border-[1.5px] border-[#111111] uppercase tracking-wider shadow-[1px_1px_0_0_#111111]"
        >
          Locked
        </span>
      </div>
      
      <div class="space-y-4">
        <!-- Service Provider Selector -->
        <div class="relative">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Service Provider</label>
          
          <!-- Custom Trigger Button -->
          <button 
            type="button"
            :disabled="isLocked"
            @click.stop="toggleDropdown('service')"
            class="w-full flex items-center justify-between p-2.5 px-3.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-semibold rounded-xl text-sm outline-none transition-all text-left disabled:bg-[#E6DFD3] disabled:text-gray-500 disabled:cursor-not-allowed"
            :class="{ 'shadow-[2px_2px_0_0_#111111] bg-[#FAFFA0]/10': activeDropdown === 'service' }"
          >
            <span>{{ serviceProvider === 'Ollama' ? 'Ollama (Local)' : 'Hugging Face (Cloud)' }}</span>
            <span class="font-black text-[0.7rem] transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'service' }">▼</span>
          </button>

          <!-- Rebuilt Options Compartment -->
          <div 
            v-if="activeDropdown === 'service' && !isLocked" 
            class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-xl overflow-hidden shadow-[4px_4px_0_0_#111111]"
          >
            <div 
              @click="handleServiceChange('Ollama')"
              class="p-2.5 px-3.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-[#FAFFA0] border-b-[1.5px] border-[#111111]"
            >
              Ollama (Local)
            </div>
            <div 
              @click="handleServiceChange('Hugging Face')"
              class="p-2.5 px-3.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-[#FAFFA0]"
            >
              Hugging Face (Cloud)
            </div>
          </div>
        </div>

        <!-- Dynamic Model Name Selector -->
        <div class="relative">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Model Name</label>
          
          <!-- Custom Trigger Button -->
          <button 
            type="button"
            :disabled="isLocked || availableModels.length === 0"
            @click.stop="toggleDropdown('model')"
            class="w-full flex items-center justify-between p-2.5 px-3.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-semibold rounded-xl text-sm outline-none transition-all text-left disabled:bg-[#E6DFD3] disabled:text-gray-500 disabled:cursor-not-allowed"
            :class="{ 'shadow-[2px_2px_0_0_#111111] bg-[#FAFFA0]/10': activeDropdown === 'model' }"
          >
            <span>{{ modelName }}</span>
            <span class="font-black text-[0.7rem] transition-transform duration-200" :class="{ 'rotate-180': activeDropdown === 'model' }">▼</span>
          </button>

          <!-- Rebuilt Options Compartment -->
          <div 
            v-if="activeDropdown === 'model' && !isLocked" 
            class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-xl overflow-hidden shadow-[4px_4px_0_0_#111111] max-h-48 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div 
              v-for="(model, index) in availableModels" 
              :key="model"
              @click="handleModelChange(model)"
              class="p-2.5 px-3.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-[#FAFFA0]"
              :class="{ 'border-b-[1.5px] border-[#111111]': index !== availableModels.length - 1 }"
            >
              {{ model }}
            </div>
          </div>
        </div>

        <!-- System Prompt Textarea -->
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">System Prompt</label>
          <textarea 
            :value="systemPrompt"
            @input="$emit('update:systemPrompt', ($event.target as HTMLTextAreaElement).value)"
            @focus="closeAllDropdowns"
            class="w-full p-3 border-[1.5px] border-[#111111] bg-white text-[#111111] font-medium rounded-xl text-sm h-24 outline-none focus:bg-[#FAFFA0]/10 focus:shadow-[2px_2px_0_0_#111111] transition-all resize-none"
            placeholder="Describe assistant behaviors..."
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { db, type GlobalModel } from '../db'; // Ensure relative path matches your directory setup

const props = defineProps<{
  modelName: string;
  serviceProvider: string;
  systemPrompt: string;
  isLocked: boolean;
}>();

const emit = defineEmits(['close', 'update:modelName', 'update:serviceProvider', 'update:systemPrompt']);

// Track which menu container is dropped open
const activeDropdown = ref<'service' | 'model' | null>(null);

// Core state storage tracking active records retrieved from IndexedDB
const persistentModels = ref<GlobalModel[]>([]);

const toggleDropdown = (type: 'service' | 'model') => {
  if (activeDropdown.value === type) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = type;
  }
};

const closeAllDropdowns = () => {
  activeDropdown.value = null;
};

// Refresh local memory tracking with custom or fallback seed options 
const refreshModelInventory = async () => {
  try {
    const records = await db.globalModels.toArray();
    persistentModels.value = records;
  } catch (err) {
    console.error('Failed to resolve database sequence models:', err);
  }
};

onMounted(() => {
  refreshModelInventory();
});

/**
 * Filter inventory records down to items that are actively pinned AND match 
 * the structure expected by the corresponding service provider selection.
 */
const availableModels = computed(() => {
  // 1. Filter out only the pinned items from local storage
  const pinnedItems = persistentModels.value.filter(m => m.isPinned === 1);
  
  // 2. Separate custom model tags based on naming pattern or system IDs
  if (props.serviceProvider === 'Hugging Face') {
    const hfItems = pinnedItems.filter(m => m.id?.startsWith('hf-') || m.id === 'meta-llama-3-8b-instruct');
    if (hfItems.length > 0) return hfItems.map(m => m.name);
    
    // Fallbacks if no custom variants are pinned for the provider yet
    return ['meta-llama/Meta-Llama-3-8B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'];
  } else {
    // Ollama filtering logic
    const ollamaItems = pinnedItems.filter(m => m.id?.startsWith('ollama-') || m.id === 'gemma4-31b' || m.id === 'deepseek-r1-8b' || m.id === 'qwen-2.5-7b');
    console.log('Filtered Ollama Models:', ollamaItems);
    if (ollamaItems.length > 0) return ollamaItems.map(m => m.name);
    
    return [];
  }
});

const handleServiceChange = (value: string) => {
  emit('update:serviceProvider', value);
  if (value === 'Hugging Face') {
    emit('update:modelName', 'Llama 3 8B Instruct');
  } else {
    emit('update:modelName', 'gemma4-31b');
  }
  closeAllDropdowns();
};

const handleModelChange = (value: string) => {
  emit('update:modelName', value);
  closeAllDropdowns();
};
</script>