<template>
  <div class="absolute inset-0 z-50 flex menu-container">
    <div class="w-4/5 h-full bg-[#E6DFD3] border-r-[1.5px] border-[#111111] p-6 shadow-[8px_0_0_0_#111111] flex flex-col menu-panel">
      
      <div class="mb-6 flex-shrink-0">
        <button 
          @click="handleNewChat"
          class="w-full flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-[#111111] bg-[#FAFFA0] py-3 px-4 font-bold text-sm text-[#111111] shadow-[2px_2px_0_0_#111111] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 pl-1">History</h3>
        
        <div class="flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div v-if="sessions.length === 0" class="p-4 border-[1.5px] border-dashed border-gray-500 rounded-xl text-center text-xs text-gray-600 font-medium">
            No history yet
          </div>
          
          <div 
            v-for="session in sessions" 
            :key="session.id" 
            @click="selectSession(session.id!)"
            :class="[
              'p-3 border-[1.5px] border-[#111111] rounded-xl text-sm font-medium truncate cursor-pointer transition-all',
              currentSessionId === session.id 
                ? 'bg-[#111111] text-white shadow-none' 
                : 'bg-[#FAF6F0] text-[#111111] hover:bg-[#FAFFA0]/20'
            ]"
          >
            {{ session.title }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex-1 bg-black/20 backdrop-blur-[1px] overlay" @click="$emit('close')"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { liveQuery } from 'dexie';
import { db, type ChatSession } from '../db';

const props = defineProps<{
  currentSessionId: number | null;
}>();

const emit = defineEmits(['close', 'select-session', 'create-new-chat']);

const sessions = ref<ChatSession[]>([]);

// Reactive subscription to dynamic historical thread lists
liveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray()).subscribe(
  (data) => {
    sessions.value = data;
  }
);

const handleNewChat = () => {
  emit('create-new-chat');
  emit('close');
};

const selectSession = (id: number) => {
  emit('select-session', id);
  emit('close');
};
</script>

<style scoped>
.menu-container {
  animation: slideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.menu-panel {
  animation: slideLeft 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.overlay {
  animation: fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slideLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>