<template>
  <div 
    class="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="$emit('close')"
  >
    <!-- Main Modal Container -->
    <div class="w-full max-w-[340px] bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111] animate-fade-in">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-lg font-bold tracking-tight">App State</h3>
        <span 
          v-if="isLocked" 
          class="text-[0.65rem] font-bold bg-[#E75A24] text-white px-2 py-0.5 rounded border-[1.5px] border-[#111111] uppercase tracking-wider shadow-[1px_1px_0_0_#111111]"
        >
          Locked
        </span>
      </div>

      <!-- Features Display -->
      <div class="mb-5">
        <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">FEATURES</label>
        <div class="w-full p-3 border-[1.5px] border-[#111111] bg-gray-50 text-[#111111] font-medium rounded-xl text-sm h-32 overflow-y-auto">
          <p>• Last Scraped: {{ formatDate(stats.lastUpdated) }}</p>
          <p>• Number of Records: {{ stats.totalRecords }}</p>
          <p>• Years Processed: {{ stats.yearsProcessed?.join(', ') }}</p>
          <p class="text-xs text-gray-500 mt-2">Last updated: {{ formatDate(stats.lastUpdated) }}</p>
        </div>
      </div>
      
      <div class="space-y-4">
        <!-- Scrape Trigger Button -->
        <button
          type="button"
          @click="runScrape"
          :disabled="scrapeState === 'scraping'"
          class="w-full flex items-center justify-between p-2.5 px-3.5 border-[1.5px] border-[#111111] bg-white text-[#111111] font-semibold rounded-xl text-sm outline-none cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed"
        >
          <span>{{ scrapeMessage }}</span>
          
          <!-- Scrape Icon -->
          <svg v-if="scrapeState === 'idle'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
            <path d="M16 5l4 4-4 4"></path>
          </svg>
          <svg v-else-if="scrapeState === 'scraping'" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  modelName: String,
  serviceProvider: String,
  systemPrompt: String,
  isLocked: Boolean,
  noApiKey: Boolean
});

const emit = defineEmits(['close', 'update:modelName']);

const stats = ref({ lastUpdated: null, totalRecords: 0, yearsProcessed: [] });

onMounted(async () => {
  try {
    const response = await fetch('/api/stats');
    if (response.ok) {
      stats.value = await response.json();
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
});

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
};

const scrapeState = ref('idle');
const scrapeMessage = ref('SCRAPE');

const runScrape = async () => {
  scrapeState.value = 'scraping';
  scrapeMessage.value = 'Scraping...';
  try {
    const response = await fetch('/api/scrape', { method: 'POST' });
    if (response.ok) {
      stats.value = await response.json();
      scrapeMessage.value = 'SCRAPE';
    } else {
      scrapeMessage.value = 'Error';
    }
  } catch (err) {
    console.error('Failed to scrape:', err);
    scrapeMessage.value = 'Error';
  } finally {
    scrapeState.value = 'idle';
  }
};
</script>