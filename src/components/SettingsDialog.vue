<template>
  <div 
    class="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-6 backdrop-blur-[1px]"
    @click.self="$emit('close')"
  >
    <div class="w-full bg-[#FAF6F0] border-[1.5px] border-[#111111] rounded-[24px] p-6 shadow-[0_8px_0_0_#111111]">
      <h3 class="text-lg font-bold mb-4">Model Settings</h3>
      
      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1">Model Name</label>
          <div class="p-2 border-[1.5px] border-[#111111] bg-[#E6DFD3] rounded-lg text-sm font-medium">
            {{ modelName }}
          </div>
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1">System Prompt</label>
          <textarea 
            :value="systemPrompt"
            @input="$emit('update:systemPrompt', ($event.target as HTMLTextAreaElement).value)"
            class="w-full p-2 border-[1.5px] border-[#111111] bg-white rounded-lg text-sm h-24 outline-none focus:bg-[#FAFFA0]/20 transition-colors resize-none"
          ></textarea>
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wider block mb-1">Service Provider</label>
          <div class="p-2 border-[1.5px] border-[#111111] bg-[#E6DFD3] rounded-lg text-sm font-medium">
            Ollama (Local)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelName: string;
  systemPrompt: string;
}>();

defineEmits(['close', 'update:systemPrompt']);
</script>