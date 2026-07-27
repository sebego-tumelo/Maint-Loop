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
        <div class="w-full p-3 border-[1.5px] border-[#111111] bg-gray-50 text-[#111111] font-medium rounded-xl text-sm h-24 overflow-y-auto">
          <p>• Advanced local AI processing</p>
          <p>• PWA offline support</p>
          <p>• Markdown rendering enabled</p>
          <p class="text-xs text-gray-500 mt-2">Last updated: 2026-07-27</p>
        </div>
      </div>
      
      <div class="space-y-4">
        <!-- Upload Results Selector -->
        <div class="relative">
          <label class="text-xs font-bold uppercase tracking-wider block mb-1.5 text-gray-700">UPLOAD RESULTS</label>
          
          <!-- Custom Trigger Button -->
          <div
            class="w-full flex items-center justify-between p-2.5 px-3.5 border-[1.5px] border-[#111111] bg-white text-gray-500 font-semibold rounded-xl text-sm outline-none"
          >
            <span>Select file to upload...</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelName: String,
  serviceProvider: String,
  systemPrompt: String,
  isLocked: Boolean,
  noApiKey: Boolean
});

const emit = defineEmits(['close', 'update:modelName']);
</script>