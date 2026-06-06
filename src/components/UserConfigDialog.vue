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
            v-model="displayEndpointUrl"
            @blur="handleEndpointBlur"
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

        <div class="relative flex-shrink-0">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Cloud Models Marketplace</label>
          <div class="relative">
            <input 
              v-model="searchQuery"
              @focus="isModelDropdownOpen = true"
              type="text" 
              placeholder="Search or type a model tag (e.g. gemma4:31b)..."
              class="w-full rounded-xl border-[1.5px] border-[#111111] bg-white p-2.5 px-3.5 text-sm font-semibold outline-none placeholder-gray-400"
            />
            <button 
              v-if="isModelDropdownOpen"
              @click="isModelDropdownOpen = false"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-tight text-gray-400 hover:text-[#111111]"
            >
              Done
            </button>
          </div>

          <div 
            v-if="isModelDropdownOpen" 
            class="absolute left-0 right-0 mt-2 z-[80] bg-white border-[1.5px] border-[#111111] rounded-xl shadow-[4px_4px_0_0_#111111] max-h-[220px] overflow-y-auto"
          >
            <div 
              v-if="showCustomModelCreationOption"
              @click="registerCustomModelTag"
              class="flex items-center justify-between p-3 border-b-[1.5px] border-dashed border-gray-300 bg-[#FAFFA0] hover:bg-[#f6fa7c] cursor-pointer font-bold text-xs uppercase tracking-wide text-[#111111]"
            >
              <span>✨ Add Custom Tag: "{{ searchQuery }}"</span>
              <span class="text-[10px] bg-[#111111] text-white px-2 py-0.5 rounded-md">Save Option</span>
            </div>

            <div 
              v-for="model in filteredModels" 
              :key="model.id"
              class="flex items-center justify-between p-3 border-b-[1.5px] border-[#111111] last:border-b-0 hover:bg-[#F3EDE2] transition-colors group text-sm font-medium"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 font-mono">📦</span>
                <span class="text-[#111111] font-semibold">{{ model.name }}</span>
              </div>
              
              <div class="flex items-center gap-2">
                <button 
                  @click.stop="togglePinStatus(model)"
                  class="text-xs hover:scale-110 transition-transform"
                  :title="model.isPinned ? 'Unpin Model' : 'Pin Model'"
                >
                  {{ model.isPinned ? '⭐' : '☆' }}
                </button>
                <button 
                  v-if="model.id !== 'gemma4-31b'"
                  @click.stop="removeCustomModel(model.id!)"
                  class="text-xs opacity-0 group-hover:opacity-100 text-red-500 hover:font-bold transition-opacity px-1"
                  title="Delete Entry"
                >
                  ✕
                </button>
              </div>
            </div>

            <div v-if="filteredModels.length === 0 && !showCustomModelCreationOption" class="p-4 text-center text-xs text-gray-500 font-medium">
              No matching model tags configured.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { db, type GlobalModel } from '../db';

const emit = defineEmits(['close']);

const isProviderDropdownOpen = ref(false);
const selectedProvider = ref('Ollama');

const searchQuery = ref('');
const isModelDropdownOpen = ref(false);
const availableModels = ref<GlobalModel[]>([]);

const displayApiKey = ref('');
const displayEndpointUrl = ref('');

// --- UTILITY MASK PIPELINE ---
const applyMaskFormat = (val: string) => {
  if (!val) return '';
  if (val.length <= 8) return '•'.repeat(val.length);
  return val.slice(0, 4) + '•'.repeat(val.length - 8) + val.slice(-4);
};

// --- CORE LIFE-CYCLE SYNCHRONIZATION ---
const syncFormWithDatabase = async () => {
  const targetKeyConfig = selectedProvider.value === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
  const keyRecord = await db.secureConfig.get(targetKeyConfig);
  displayApiKey.value = keyRecord && keyRecord.value ? applyMaskFormat(keyRecord.value) : '';

  if (selectedProvider.value === 'Ollama') {
    const endpointRecord = await db.secureConfig.get('ollama_endpoint');
    displayEndpointUrl.value = endpointRecord ? endpointRecord.value : '';
  } else {
    displayEndpointUrl.value = 'https://api-inference.huggingface.co';
  }
};

onMounted(async () => {
  await seedDefaultModelsIfEmpty();
  await syncFormWithDatabase();
});

// Explicit provider drop-down action requested by the template template
const handleProviderSwitch = async (provider: string) => {
  selectedProvider.value = provider;
  isProviderDropdownOpen.value = false;
  await syncFormWithDatabase();
};

// --- SECURE PROPERTY PERSISTENCE CONTROLLERS ---
const handleKeyBlur = async (e: FocusEvent) => {
  const typedValue = (e.target as HTMLInputElement).value.trim();
  if (!typedValue) return;
  if (typedValue.includes('•')) return;

  const targetKeyConfig = selectedProvider.value === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
  await saveConfigValue(targetKeyConfig, typedValue);
  displayApiKey.value = applyMaskFormat(typedValue);
};

const handleKeyFocus = async () => {
  const targetKeyConfig = selectedProvider.value === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
  const keyRecord = await db.secureConfig.get(targetKeyConfig);
  displayApiKey.value = keyRecord ? keyRecord.value : '';
};

const handleEndpointBlur = async (e: FocusEvent) => {
  if (selectedProvider.value !== 'Ollama') return;
  const urlValue = (e.target as HTMLInputElement).value.trim();
  await saveConfigValue('ollama_endpoint', urlValue);
};

const saveConfigValue = async (key: string, value: string) => {
  await db.secureConfig.put({ key, value: value.trim() });
};

const saveAndClose = () => {
  emit('close');
};

// --- DYNAMIC MODEL INVENTORY PROCESSING ---
const seedDefaultModelsIfEmpty = async () => {
  const count = await db.globalModels.count();
  if (count === 0) {
    await db.globalModels.bulkAdd([
      { id: 'gemma4-31b', name: 'gemma4:31b', isPinned: 1 },
      { id: 'deepseek-r1-8b', name: 'deepseek-r1:8b', isPinned: 0 },
      { id: 'qwen-2.5-7b', name: 'qwen2.5:7b', isPinned: 0 }
    ]);
  }
  availableModels.value = await db.globalModels.toArray();
};

const filteredModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  let base = availableModels.value;

  if (query) {
    base = base.filter(m => m.name.toLowerCase().includes(query));
  }

  return [...base].sort((a, b) => (b.isPinned || 0) - (a.isPinned || 0));
});

const showCustomModelCreationOption = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return false;
  return !availableModels.value.some(m => m.name.toLowerCase() === query.toLowerCase());
});

const registerCustomModelTag = async () => {
  const tag = searchQuery.value.trim();
  if (!tag) return;

  const normalizedId = tag.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const newModelEntry: GlobalModel = {
    id: normalizedId,
    name: tag,
    isPinned: 1
  };

  try {
    await db.globalModels.add(newModelEntry);
    availableModels.value = await db.globalModels.toArray();
    searchQuery.value = ''; 
    console.log(`Successfully registered model tag: ${tag}`);
  } catch (err) {
    console.error('Failed to commit model entry:', err);
  }
};

const togglePinStatus = async (modelItem: GlobalModel) => {
  const nextState = modelItem.isPinned ? 0 : 1;
  await db.globalModels.update(modelItem.id, { isPinned: nextState });
  availableModels.value = await db.globalModels.toArray();
};

const removeCustomModel = async (modelId: string) => {
  await db.globalModels.delete(modelId);
  availableModels.value = await db.globalModels.toArray();
};
</script>