<template>
  <div class="absolute inset-0 z-50 flex">
    <div class="w-4/5 h-full bg-[#E6DFD3] border-r-[1.5px] border-[#111111] p-6 shadow-[8px_0_0_0_#111111] flex flex-col">
      <h3 class="text-xl font-bold mb-6">History</h3>
      <div class="space-y-3 overflow-y-auto pr-1">
        <div 
          v-for="i in 5" 
          :key="i" 
          class="p-3 border-[1.5px] border-[#111111] bg-[#FAF6F0] rounded-xl text-sm font-medium truncate cursor-pointer hover:bg-[#FAFFA0]/20 transition-colors"
        >
          Previous Chat Session #{{ i }}
        </div>
      </div>
    </div>
    
    <div class="flex-1 bg-black/20 backdrop-blur-[1px]" @click="$emit('close')"></div>
  </div>
</template>

<script setup lang="ts">
defineEmits(['close']);
</script>