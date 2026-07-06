<template>
  <div class="absolute inset-0 z-50 flex menu-container">
    <div class="w-4/5 h-full bg-[#E6DFD3] border-r-[1.5px] border-[#111111] p-6 shadow-[8px_0_0_0_#111111] flex flex-col menu-panel justify-between">
      
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
              @click="selectSession(session.id)"
              :class="[
                'group relative flex items-center justify-between p-3 border-[1.5px] border-[#111111] rounded-xl text-sm font-medium cursor-pointer transition-all',
                currentSessionId === session.id 
                  ? 'bg-[#111111] text-white shadow-none' 
                  : 'bg-[#FAF6F0] text-[#111111] hover:bg-[#FAFFA0]/20'
              ]"
            >
              <span class="truncate flex-1 pr-6">{{ session.title }}</span>

              <button
                @click.stop="promptDelete(session)"
                :class="[
                  'absolute right-2.5 p-1 rounded-md border border-transparent transition-all md:opacity-0 group-hover:opacity-100',
                  currentSessionId === session.id 
                    ? 'text-gray-400 hover:text-red-400 hover:bg-white/10' 
                    : 'text-gray-500 hover:text-red-600 hover:bg-black/5 hover:border-[#111111]'
                ]"
                title="Delete Conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t-[1.5px] border-[#111111] flex-shrink-0">
        <div 
          @click="$emit('open-user-config')"
          class="flex items-center gap-3 p-2.5 border-[1.5px] border-[#111111] bg-[#FAF6F0] rounded-2xl cursor-pointer hover:bg-[#FAFFA0]/20 transition-all hover:shadow-[2px_2px_0_0_#111111] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <div class="w-10 h-10 rounded-full bg-[#E75A24] border-[1.5px] border-[#111111] flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0_0_#111111]">
            <div class="w-7 h-7 rounded-full flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <p class="text-xs font-black text-[#111111] tracking-tight truncate">User Config</p>
            <p class="text-[0.65rem] text-gray-500 font-bold uppercase tracking-wider">Profile Settings</p>
          </div>
        </div>
      </div>

    </div>
    
    <div class="flex-1 bg-black/20 backdrop-blur-[1px] overlay" @click="$emit('close')"></div>

    <Transition name="fade-scale">
      <div v-if="showDeleteDialog" class="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-[1.5px]" @click="closeDeleteDialog"></div>
        
        <div class="relative w-full max-w-sm bg-[#FAF6F0] border-[2px] border-[#111111] p-6 rounded-2xl shadow-[6px_6px_0_0_#111111] z-10 transform transition-all">
          
          <div class="flex items-center gap-3 mb-3 text-red-600">
            <div class="p-2 bg-red-100 rounded-xl border border-[#111111] shadow-[1px_1px_0_0_#111111]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h2 class="text-base font-black text-[#111111] uppercase tracking-tight">Delete History?</h2>
          </div>

          <p class="text-xs text-gray-700 leading-relaxed font-semibold mb-6">
            Are you sure you want to delete <span class="italic text-black font-black">"{{ targetSessionToDelete?.title }}"</span>? This will permanently wipe all conversation messages from your local disk database.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button 
              @click="closeDeleteDialog"
              class="w-full py-2.5 rounded-xl border-[1.5px] border-[#111111] bg-white text-sm font-black text-[#111111] shadow-[2px_2px_0_0_#111111] transition-all hover:bg-gray-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              No, Keep
            </button>
            
            <button 
              @click="confirmDelete"
              class="w-full py-2.5 rounded-xl border-[1.5px] border-[#111111] bg-red-500 text-sm font-black text-white shadow-[2px_2px_0_0_#111111] transition-all hover:bg-red-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              Yes, Delete
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { liveQuery } from 'dexie';
import { db } from '../db';

const props = defineProps({
  currentSessionId: [Number, null]
});

const emit = defineEmits(['close', 'select-session', 'create-new-chat', 'open-user-config']);
const sessions = ref([]);

// Tracking reactive properties for the delete modal state layout
const showDeleteDialog = ref(false);
const targetSessionToDelete = ref<ChatSession | null>(null);

// Dexie LiveQuery automatically handles list updates dynamically when items vanish from the db
liveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray()).subscribe(
  (data) => {
    sessions.value = data;
  }
);

const handleNewChat = () => {
  emit('create-new-chat');
  emit('close');
};

const selectSession = (id) => {
  emit('select-session', id);
  emit('close');
};

/**
 * Halts normal list container clicks and populates modal configuration states
 */
const promptDelete = (session) => {
  targetSessionToDelete.value = session;
  showDeleteDialog.value = true;
};

const closeDeleteDialog = () => {
  showDeleteDialog.value = false;
  targetSessionToDelete.value = null;
};

/**
 * Triggers atomic Dexie table item removal sequences across both databases
 */
const confirmDelete = async () => {
  if (!targetSessionToDelete.value || targetSessionToDelete.value.id === undefined) return;
  
  const targetId = targetSessionToDelete.value.id;

  try {
    // 1. Clear all chat bubbles referencing this explicit target session inside your messages table
    await db.messages.where('sessionId').equals(targetId).delete();

    // 2. Clear the main indexing session entry record out of the sessions table
    await db.sessions.delete(targetId);

    // 3. Fallback check: If the active running session was just dropped, force a fresh chat context
    if (props.currentSessionId === targetId) {
      emit('create-new-chat');
    }
  } catch (error) {
    console.error('Failed to wipe session records from IndexedDB storage line:', error);
  } finally {
    closeDeleteDialog();
  }
};
</script>

<style scoped>
/* Transition Scale-Fade Animation Curve Profiles */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>