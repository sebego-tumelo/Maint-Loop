<template>
  <div 
    class="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="isProviderDropdownOpen = false; saveAndClose()"
  >
    <div class="w-full max-w-[340px] bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111] animate-fade-in flex flex-col max-h-[90vh]">
      
      <h3 class="text-lg font-bold tracking-tight mb-4">Profile Configuration</h3>
      
      <div class="space-y-4 flex-1 flex flex-col overflow-hidden">
        <div class="relative flex-shrink-0">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Active Provider</label>
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
              @click="handleProviderSwitch(provider)"
              class="p-2.5 px-3.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-[#FAFFA0] last:border-0 border-b-[1.5px] border-[#111111]"
            >
              {{ provider }}
            </div>
          </div>
        </div>

        <div v-if="selectedProvider === 'Ollama'" class="flex-shrink-0">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Cloud Host Endpoint</label>
          <input 
            v-model="ollamaEndpoint"
            @blur="saveConfigValue('ollama_endpoint', ollamaEndpoint)"
            type="text"
            placeholder="https://your-cloud-domain.com"
            class="w-full p-2.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-medium rounded-xl text-sm outline-none focus:bg-[#FAFFA0]/10 focus:shadow-[2px_2px_0_0_#111111] transition-all"
          />
        </div>

        <div class="flex-shrink-0">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">API Access Token</label>
          <input 
            v-model="displayApiKey"
            @focus="handleKeyFocus"
            @blur="handleKeyBlur"
            type="text"
            placeholder="Enter authentication key..."
            class="w-full p-2.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-medium rounded-xl text-sm outline-none focus:bg-[#FAFFA0]/10 focus:shadow-[2px_2px_0_0_#111111] transition-all font-mono"
          />
        </div>

        <div class="flex-1 flex flex-col overflow-hidden border-[1.5px] border-[#111111] bg-[#E6DFD3]/40 rounded-xl p-3">
          <label class="text-xs font-bold uppercase tracking-wider block mb-2 text-gray-700">Cloud Models Marketplace</label>
          
          <div class="relative mb-3 flex-shrink-0">
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Search cloud models..."
              class="w-full p-2.5 pl-9 border-[1.5px] border-[#111111] bg-white text-[#111111] font-medium rounded-xl text-xs outline-none focus:bg-[#FAFFA0]/10 focus:shadow-[2px_2px_0_0_#111111] transition-all placeholder-gray-500"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#111111] pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
          </div>

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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { db, type GlobalModel } from '../db';

const emit = defineEmits(['close']);

const selectedProvider = ref('Ollama');
const ollamaEndpoint = ref('');
const searchQuery = ref('');
const isProviderDropdownOpen = ref(false);
const availableModels = ref<GlobalModel[]>([]);

// Internal non-reactive memory buffers holding secret raw characters
let rawOllamaKey = '';
let rawHfKey = '';

// The reactive string linked directly to the input template view
const displayApiKey = ref('');
const isInputFocused = ref(false);

const activeKeyConfigName = computed(() => {
  return selectedProvider.value === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
});

// Masking formula generator: leaves first 3 chars intact, converts remainder to hyphens
const applyMaskFormat = (secret: string) => {
  if (!secret) return '';
  if (secret.length <= 3) return secret;
  return secret.slice(0, 3) + '-'.repeat(Math.max(12, secret.length - 3));
};

const loadConfigData = async () => {
  // 1. Fetch Provider Profile
  const providerRecord = await db.secureConfig.get('active_provider');
  if (providerRecord) selectedProvider.value = providerRecord.value;

  // 2. Fetch Endpoints
  const endpointRecord = await db.secureConfig.get('ollama_endpoint');
  if (endpointRecord) ollamaEndpoint.value = endpointRecord.value;

  // 3. Populate memory buffers directly from persistent database
  const ollamaKeyRecord = await db.secureConfig.get('ollama_api_key');
  rawOllamaKey = ollamaKeyRecord ? ollamaKeyRecord.value : '';

  const hfKeyRecord = await db.secureConfig.get('hf_api_key');
  rawHfKey = hfKeyRecord ? hfKeyRecord.value : '';

  // Apply visual string masking mask initially
  displayApiKey.value = applyMaskFormat(selectedProvider.value === 'Ollama' ? rawOllamaKey : rawHfKey);
};

const handleProviderSwitch = async (provider: string) => {
  selectedProvider.value = provider;
  isProviderDropdownOpen.value = false;
  await saveConfigValue('active_provider', provider);
  
  // Re-render masked character templates depending on selected provider target
  displayApiKey.value = applyMaskFormat(provider === 'Ollama' ? rawOllamaKey : rawHfKey);
};

const handleKeyFocus = () => {
  isInputFocused.value = true;
  // If a key exists, wipe textbox clean on click to let user overwrite cleanly
  // const currentRaw = selectedProvider.value === 'Ollama' ? rawOllamaKey : rawHfKey;
  // if (currentRaw) {
  //   displayApiKey.value = '';
  // }
};

const handleKeyBlur = async () => {
  isInputFocused.value = false;
  const typedValue = displayApiKey.value.trim();

  // If input string is empty and they left, retain original keys without modification
  if (typedValue === '') {
    displayApiKey.value = applyMaskFormat(selectedProvider.value === 'Ollama' ? rawOllamaKey : rawHfKey);
    return;
  }

  // If they typed a value that contains masking characters, ignore write cycle
  if (typedValue.includes('-')) {
    displayApiKey.value = applyMaskFormat(selectedProvider.value === 'Ollama' ? rawOllamaKey : rawHfKey);
    return;
  }

  // Commit clean raw values to permanent db records and sync memory caches
  if (selectedProvider.value === 'Ollama') {
    rawOllamaKey = typedValue;
    await saveConfigValue('ollama_api_key', rawOllamaKey);
  } else {
    rawHfKey = typedValue;
    await saveConfigValue('hf_api_key', rawHfKey);
  }

  // Immediately overwrite display box string with safe masked configuration
  displayApiKey.value = applyMaskFormat(typedValue);
};

const saveConfigValue = async (key: string, value: string) => {
  await db.secureConfig.put({ key, value: value.trim() });
};

const saveAndClose = () => {
  emit('close');
};

const seedDefaultModelsIfEmpty = async () => {
  const count = await db.globalModels.count();
  if (count === 0) {
    await db.globalModels.bulkAdd([
      { id: 'gemma-4-12b', name: 'Gemma 4 12B', isPinned: 1 },
      { id: 'gemma-3-270m', name: 'Gemma 3 270M (Colab)', isPinned: 0 },
      { id: 'deepseek-r1-8b', name: 'DeepSeek R1 8B', isPinned: 0 },
      { id: 'qwen-2.5-7b', name: 'Qwen 2.5 7B', isPinned: 0 }
    ]);
  }
  availableModels.value = await db.globalModels.toArray();
};

const filteredModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  let base = availableModels.value;
  if (query) base = base.filter(m => m.name.toLowerCase().includes(query));
  return [...base].sort((a, b) => b.isPinned - a.isPinned);
});

const toggleSelectModel = async (model: GlobalModel) => {
  const updatedState = model.isPinned ? 0 : 1;
  await db.globalModels.update(model.id!, { isPinned: updatedState });
  availableModels.value = await db.globalModels.toArray();
};

onMounted(() => {
  loadConfigData();
  seedDefaultModelsIfEmpty();
});
</script>