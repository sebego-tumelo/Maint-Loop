<template>
  <div 
    class="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="isProviderDropdownOpen = false; saveAndClose()"
  >
    <div class="w-full max-w-[360px] bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111] animate-fade-in flex flex-col max-h-[90vh]">
      
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
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">Search & Register Models</label>
          <div class="relative">
            <input 
              v-model="searchQuery"
              @focus="isModelDropdownOpen = true"
              type="text" 
              :placeholder="selectedProvider === 'Ollama' ? 'e.g. gemma4:31b, llama3.3...' : 'e.g. meta-llama/Llama-3-8b...'"
              class="w-full rounded-xl border-[1.5px] border-[#111111] bg-white p-2.5 px-3.5 text-sm font-semibold outline-none placeholder-gray-400"
            />
            <button 
              v-if="isModelDropdownOpen"
              @click="isModelDropdownOpen = false; searchQuery = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-tight text-gray-500 hover:text-red-500"
            >
              Clear
            </button>
          </div>

          <div 
            v-if="isModelDropdownOpen" 
            class="absolute left-0 right-0 mt-1 z-[80] bg-white border-[1.5px] border-[#111111] rounded-xl shadow-[4px_4px_0_0_#111111] max-h-[180px] overflow-y-auto"
          >
            <div 
              v-if="showCustomModelCreationOption"
              @click="registerCustomModelTag"
              class="flex items-center justify-between p-3 border-b-[1.5px] border-dashed border-gray-300 bg-[#FAFFA0] hover:bg-[#f6fa7c] cursor-pointer font-bold text-xs uppercase tracking-wide text-[#111111]"
            >
              <span>✨ Add New Tag: "{{ searchQuery }}"</span>
              <span class="text-[10px] bg-[#111111] text-white px-2 py-0.5 rounded-md">Save</span>
            </div>

            <div 
              v-for="model in filteredSearchModels" 
              :key="model.id"
              @click="selectAndCloseDropdown(model.name)"
              class="p-2.5 px-3.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-[#F3EDE2] border-b-[1.5px] border-[#111111] last:border-0"
            >
              📦 {{ model.name }}
            </div>
          </div>
        </div>

        <div class="flex-1 flex flex-col overflow-hidden min-h-[150px]">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">
            Available {{ selectedProvider }} Models
          </label>
          
          <div class="flex-1 overflow-y-auto border-[1.5px] border-[#111111] bg-white rounded-xl p-1.5 space-y-1">
            <div 
              v-for="model in providerSpecificModels" 
              :key="model.id"
              class="flex items-center justify-between p-2 px-3 rounded-lg hover:bg-[#FAF6F0] transition-colors group text-xs font-medium border border-transparent hover:border-[#111111]/10"
            >
              <div class="flex items-center gap-2 truncate">
                <span class="text-gray-400 font-mono text-[10px]">⭐</span>
                <span class="text-[#111111] font-bold truncate">{{ model.name }}</span>
              </div>
              
              <div class="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <span class="text-[10px] uppercase font-bold text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                  {{ model.isPinned ? 'Pinned' : 'Ready' }}
                </span>
                <button 
                  v-if="!isProtectedDefault(model.name)"
                  @click.stop="removeCustomModel(model.id || '')"
                  class="text-gray-400 hover:text-red-500 font-bold px-1 text-[11px] transition-colors"
                  title="Remove Model"
                >
                  ✕
                </button>
              </div>
            </div>

            <div v-if="providerSpecificModels.length === 0" class="p-4 text-center text-xs text-gray-400 font-medium italic">
              No models saved for this service provider.
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { db, type GlobalModel } from '../db';

const emit = defineEmits(['close']);

const isProviderDropdownOpen = ref(false);
const selectedProvider = ref('Ollama');

const searchQuery = ref('');
const isModelDropdownOpen = ref(false);
const availableModels = ref<GlobalModel[]>([]);

// Added a dedicated structural key flag to allow dynamic database entries to attach to distinct engines
interface ExtendedGlobalModel extends GlobalModel {
  engineProvider?: 'Ollama' | 'Hugging Face';
}

const displayApiKey = ref('');
const displayEndpointUrl = ref('');

// --- CORE LIFE-CYCLE SEEDING & SYNC ---
const seedDefaultModelsIfEmpty = async () => {
  const count = await db.globalModels.count();
  if (count === 0) {
    await db.globalModels.bulkAdd([
      // Top 3 definitive choices for Ollama Cloud infrastructure routing
      { id: 'ollama-gemma4-31b', name: 'gemma4:31b', isPinned: 1 },
      { id: 'ollama-deepseek-r1-8b', name: 'deepseek-r1:8b', isPinned: 0 },
      { id: 'ollama-qwen2-5-7b', name: 'qwen2.5:7b', isPinned: 0 },
      // Top 3 definitive serverless endpoints for Hugging Face inference pipelines
      { id: 'hf-llama3-8b', name: 'meta-llama/Meta-Llama-3-8B-Instruct', isPinned: 1 },
      { id: 'hf-phi3-mini', name: 'microsoft/Phi-3-mini-4k-instruct', isPinned: 0 },
      { id: 'hf-mixtral-8x7b', name: 'mistralai/Mixtral-8x7B-Instruct-v0.1', isPinned: 0 }
    ]);
  }
  availableModels.value = await db.globalModels.toArray();
};

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

// Protect core items from being accidentally cleared out of the list view tracking array
const isProtectedDefault = (name: string): boolean => {
  const protectedItems = [
    'gemma4:31b', 'deepseek-r1:8b', 'qwen2.5:7b',
    'meta-llama/Meta-Llama-3-8B-Instruct', 'microsoft/Phi-3-mini-4k-instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'
  ];
  return protectedItems.includes(name);
};

// --- DYNAMIC INVENTORY QUERY CONTROLLERS ---
// 1. Returns saved history filtered specifically by active service engine tab selection
const providerSpecificModels = computed(() => {
  return availableModels.value.filter(model => {
    const nameLower = model.name.toLowerCase();
    const isHfModel = nameLower.includes('/') || model.id?.startsWith('hf-');
    return selectedProvider.value === 'Hugging Face' ? isHfModel : !isHfModel;
  });
});

// 2. Isolates dropdown filter matching strictly inside the active view
const filteredSearchModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return providerSpecificModels.value;
  return providerSpecificModels.value.filter(m => m.name.toLowerCase().includes(query));
});

const showCustomModelCreationOption = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return false;
  return !providerSpecificModels.value.some(m => m.name.toLowerCase() === query.toLowerCase());
});

const selectAndCloseDropdown = (modelName: string) => {
  searchQuery.value = modelName;
  isModelDropdownOpen.value = false;
};

// --- PERSISTENCE WRITERS ---
const registerCustomModelTag = async () => {
  const tag = searchQuery.value.trim();
  if (!tag) return;

  const prefix = selectedProvider.value === 'Ollama' ? 'ollama-' : 'hf-';
  const normalizedId = prefix + tag.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  const newModelEntry: GlobalModel = {
    id: normalizedId,
    name: tag,
    isPinned: 1
  };

  try {
    await db.globalModels.add(newModelEntry);
    availableModels.value = await db.globalModels.toArray();
    searchQuery.value = ''; 
    isModelDropdownOpen.value = false;
  } catch (err) {
    console.error('Failed to commit entry:', err);
  }
};

const removeCustomModel = async (modelId: string) => {
  await db.globalModels.delete(modelId);
  availableModels.value = await db.globalModels.toArray();
};

const handleProviderSwitch = async (provider: string) => {
  selectedProvider.value = provider;
  isProviderDropdownOpen.value = false;
  searchQuery.value = '';
  await syncFormWithDatabase();
};

// --- CREDENTIAL OBFUSCATION SERVICES ---
const applyMaskFormat = (val: string) => {
  if (!val) return '';
  if (val.length <= 8) return '•'.repeat(val.length);
  return val.slice(0, 4) + '•'.repeat(val.length - 8) + val.slice(-4);
};

const handleKeyBlur = async (e: FocusEvent) => {
  const typedValue = (e.target as HTMLInputElement).value.trim();
  if (!typedValue || typedValue.includes('•')) return;
  const targetKeyConfig = selectedProvider.value === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
  await db.secureConfig.put({ key: targetKeyConfig, value: typedValue });
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
  await db.secureConfig.put({ key: 'ollama_endpoint', value: urlValue });
};

const saveAndClose = () => {
  emit('close');
};
</script>