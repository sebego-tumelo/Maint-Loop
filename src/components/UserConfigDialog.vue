<template>
  <div 
    class="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="isProviderDropdownOpen = false; $emit('close')"
  >
    <div class="w-full max-w-[340px] bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111] animate-fade-in flex flex-col max-h-[90vh]">
      
      <h3 class="text-lg font-bold tracking-tight mb-4">Profile Configuration</h3>
      
      <div class="space-y-4 flex-1 flex flex-col overflow-hidden">
        <!-- Service Provider Custom Dropdown -->
        <div class="relative flex-shrink-0">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Service Provider</label>
          <button 
            type="button"
            @click.stop="isProviderDropdownOpen = !isProviderDropdownOpen"
            class="w-full flex items-center justify-between p-2.5 px-3.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-semibold rounded-xl text-sm outline-none transition-all text-left"
            :class="{ 'shadow-[2px_2px_0_0_#111111] bg-[#FAFFA0]/10': isProviderDropdownOpen }"
          >
            <span>{{ selectedProvider }}</span>
            <span class="font-black text-[0.7rem] transition-transform duration-200" :class="{ 'rotate-180': isProviderDropdownOpen }">▼</span>
          </button>

          <div 
            v-if="isProviderDropdownOpen" 
            class="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-xl overflow-hidden shadow-[4px_4px_0_0_#111111]"
          >
            <div 
              v-for="provider in ['Ollama', 'Hugging Face']" 
              :key="provider"
              @click="selectedProvider = provider; isProviderDropdownOpen = false"
              class="p-2.5 px-3.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-[#FAFFA0] last:border-0 border-b-[1.5px] border-[#111111]"
            >
              {{ provider }}
            </div>
          </div>
        </div>

        <!-- API Key Input Field -->
        <div class="flex-shrink-0">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">API Key</label>
          <input 
            v-model="apiKey"
            type="password"
            placeholder="Enter authentication key..."
            class="w-full p-2.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-medium rounded-xl text-sm outline-none focus:bg-[#FAFFA0]/10 focus:shadow-[2px_2px_0_0_#111111] transition-all"
          />
        </div>

        <!-- Custom Searchable Cloud Models Sub-Compartment -->
        <div class="flex-1 flex flex-col overflow-hidden border-[1.5px] border-[#111111] bg-[#E6DFD3]/40 rounded-xl p-3">
          <label class="text-xs font-bold uppercase tracking-wider block mb-2 text-gray-700">Cloud Models Marketplace</label>
          
          <!-- Search input panel -->
          <div class="relative mb-3 flex-shrink-0">
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Search Ollama models... (e.g. Gemma)"
              class="w-full p-2 pl-8 border-[1.5px] border-[#111111] bg-white text-[#111111] font-medium rounded-lg text-xs outline-none"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#111111] pointer-events-none">
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="3" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  </span>
          </div>

          <!-- Sorted Model Items Feed Box -->
          <div class="flex-1 overflow-y-auto space-y-1.5 pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div 
              v-for="model in filteredModels" 
              :key="model.id"
              @click="toggleSelectModel(model)"
              class="flex items-center justify-between p-2 rounded-lg border-[1.5px] border-[#111111] cursor-pointer text-xs font-bold transition-all"
              :class="model.isPinned ? 'bg-[#FAFFA0] text-[#111111] shadow-[1px_1px_0_0_#111111]' : 'bg-white text-gray-800 hover:bg-[#FAFFA0]/20'"
            >
              <span class="truncate">{{ model.name }}</span>
              <span v-if="model.isPinned" class="text-[0.6rem] bg-[#111111] text-white px-1.5 py-0.5 rounded border border-[#111111]">SELECTED</span>
            </div>
            
            <div v-if="filteredModels.length === 0" class="text-center py-4 text-xs text-gray-500 font-medium border border-dashed border-gray-400 rounded-lg">
              No cloud matches found
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db, type GlobalModel } from '../db';

defineEmits(['close']);

const selectedProvider = ref('Ollama');
const apiKey = ref('');
const searchQuery = ref('');
const isProviderDropdownOpen = ref(false);
const availableModels = ref<GlobalModel[]>([]);

// Seed default sample data if the engine registry is entirely pristine
const seedDefaultModelsIfEmpty = async () => {
  const count = await db.globalModels.count();
  if (count === 0) {
    const defaultRegistry: GlobalModel[] = [
      { id: 'gemma-4-12b', name: 'Gemma 4 12B', isPinned: 1 },
      { id: 'gemma-3-270m', name: 'Gemma 3 270M (Colab)', isPinned: 0 },
      { id: 'deepseek-r1-8b', name: 'DeepSeek R1 8B', isPinned: 0 },
      { id: 'qwen-2.5-7b', name: 'Qwen 2.5 7B', isPinned: 0 },
      { id: 'kimi-k2', name: 'Kimi K2 Local', isPinned: 0 }
    ];
    await db.globalModels.bulkAdd(defaultRegistry);
  }
  loadModelsFromStorage();
};

const loadModelsFromStorage = async () => {
  availableModels.value = await db.globalModels.toArray();
};

// Sorts pinned models straight to the top of the list, followed by standard items
const filteredModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  let baseList = availableModels.value;

  if (query) {
    baseList = baseList.filter(m => m.name.toLowerCase().includes(query));
  }

  return [...baseList].sort((a, b) => b.isPinned - a.isPinned);
});

const toggleSelectModel = async (model: GlobalModel) => {
  // Flip model selection state
  const updatedState = model.isPinned ? 0 : 1;
  await db.globalModels.update(model.id!, { isPinned: updatedState });
  await loadModelsFromStorage();
};

onMounted(() => {
  seedDefaultModelsIfEmpty();
});
</script>