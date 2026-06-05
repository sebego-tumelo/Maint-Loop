<template>
  <div class="absolute inset-0 z-50 flex menu-container">
    <div class="w-4/5 h-full bg-[#E6DFD3] border-r-[1.5px] border-[#111111] p-6 shadow-[8px_0_0_0_#111111] flex flex-col menu-panel justify-between">
      
      <!-- Top Actions Compartment -->
      <div class="flex-1 flex flex-col overflow-hidden">
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

        <div class="flex-1 flex flex-col overflow-hidden mb-4">
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

      <!-- Bottom Profile Configuration Interaction Target -->
      <div class="pt-4 border-t-[1.5px] border-[#111111] flex-shrink-0">
        <div 
          @click="$emit('open-user-config')"
          class="flex items-center gap-3 p-2.5 border-[1.5px] border-[#111111] bg-[#FAF6F0] rounded-2xl cursor-pointer hover:bg-[#FAFFA0]/20 transition-all hover:shadow-[2px_2px_0_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <!-- Avatar Frame -->
          <div class="w-10 h-10 rounded-full bg-[#E75A24] border-[1.5px] border-[#111111] flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0_0_#111111]">
            <div class="w-7 h-7 rounded-full bg-[#111111] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          
          <!-- Metadata Tag -->
          <div class="flex-1 min-w-0">
            <p class="text-xs font-black text-[#111111] tracking-tight truncate">User Config</p>
            <p class="text-[0.65rem] text-gray-500 font-bold uppercase tracking-wider">Profile Settings</p>
          </div>
        </div>
      </div>

    </div>
    
    <div class="flex-1 bg-black/20 backdrop-blur-[1px] overlay" @click="$emit('close')"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { liveQuery } from 'dexie';
import { db, type ChatSession } from '../db';

const props = defineProps<{
  currentSessionId: number | null;
}>();

// Added open-user-config declaration
const emit = defineEmits(['close', 'select-session', 'create-new-chat', 'open-user-config']);

const sessions = ref<ChatSession[]>([]);

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