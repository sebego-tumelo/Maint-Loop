<template>
  <div class="flex min-h-screen items-center justify-center bg-[#F3EDE2] p-4 text-[#111111] md:min-h-screen md:p-4 sm:min-h-dvh sm:p-0">
    <div class="relative flex h-[800px] w-full max-w-[390px] flex-col overflow-hidden rounded-[32px] border-[1.5px] border-[#111111] bg-[#FAF6F0] shadow-[0_8px_0_0_#111111] md:h-[800px] sm:h-dvh sm:max-w-full sm:rounded-none sm:border-0 sm:shadow-none">
      
      <div 
        v-if="!isOnline" 
        class="bg-[#E75A24] text-white text-center text-xs py-1 font-semibold border-b-[1.5px] border-[#111111] tracking-wide"
      >
        Working Offline
      </div>

      <header class="flex items-center justify-between border-b-[1.5px] border-[#111111] bg-[#FAF6F0] px-4 py-5 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="relative h-11 w-11">
            <div class="flex h-full w-full items-center justify-center rounded-full border-[1.5px] border-[#111111] bg-[#E75A24] text-lg font-bold text-white">
              M
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[1.5px] border-[#111111] bg-[#FAFFA0]"></div>
          </div>
          <div>
            <h2 class="text-[1.05rem] font-semibold leading-none">Musmentor AI</h2>
            <p class="text-[0.75rem] text-gray-600">Interactive Music Guide</p>
          </div>
        </div>
        <div class="rounded-full border-[1.5px] border-[#111111] bg-[#FAFFA0] px-3 py-1.5 text-[0.75rem] font-semibold uppercase tracking-wider">
          PRO
        </div>
      </header>

      <main ref="chatContainer" class="flex-1 flex flex-col overflow-y-auto bg-[#FAF6F0] p-4 space-y-4">
        
        <div v-if="localMessages.length === 0" class="rounded-[20px] border-[1.5px] border-[#111111] bg-[#E6DFD3] p-5">
          <h1 class="mb-2 text-2xl font-semibold leading-tight">
            Interactive online music education that inspires ⚡
          </h1>
          <p class="text-[0.85rem] leading-relaxed text-gray-800">
            Ask me anything about chord structures, masterclasses, or unlocking your musical excellence.
          </p>
        </div>

        <div 
          v-for="msg in localMessages" 
          :key="msg.id"
          :class="[
            'max-w-[85%] rounded-[20px] border-[1.5px] border-[#111111] p-3.5 text-[0.9rem] leading-relaxed',
            msg.sender === 'ai' 
              ? 'self-start rounded-tl-none bg-white text-[#111111]' 
              : 'self-end rounded-tr-none bg-[#111111] text-white'
          ]"
        >
          {{ msg.text }}
        </div>
      </main>

      <div class="flex gap-2 overflow-x-auto bg-[#FAF6F0] px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden">
        <button 
          v-for="chip in suggestions" 
          :key="chip"
          @click="selectSuggestion(chip)"
          class="whitespace-nowrap rounded-full border-[1.5px] border-[#111111] bg-white px-4 py-2 text-[0.8rem] font-medium transition-transform active:scale-95"
        >
          {{ chip }}
        </button>
      </div>

      <footer class="flex items-center gap-2.5 bg-[#FAF6F0] px-4 pb-6 pt-4 border-t-[1.5px] border-[#111111] flex-shrink-0">
        <div class="relative flex flex-1 items-center">
          <input 
            v-model="inputMessage"
            @keydown.enter="sendMessage"
            type="text" 
            placeholder="Type your musical question..."
            class="w-full rounded-full border-[1.5px] border-[#111111] bg-[#E6DFD3] py-3.5 pl-4 pr-11 text-[0.9rem] font-medium text-[#111111] placeholder-gray-600 outline-none"
          />
          <button class="absolute right-3.5 flex items-center justify-center text-xl" title="Attach file">
            <svg class="h-4.5 w-4.5 stroke-gray-700" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
        </div>
        
        <button 
          @click="sendMessage"
          class="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[#111111] bg-[#111111] transition-colors hover:bg-gray-900"
          title="Send Message"
        >
          <svg class="h-4.5 w-4.5 fill-none stroke-white" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </footer>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useOnline } from '@vueuse/core';
import { liveQuery } from 'dexie';
import { db, type ChatMessage } from '../db';

// Network awareness hook via VueUse
const isOnline = useOnline();

// Refs
const inputMessage = ref('');
const chatContainer = ref<HTMLElement | null>(null);

const suggestions = ref([
  '🎵 Yes, in key of C',
  '🎹 Show chord formulas',
  'Secrets of music class'
]);

// Reactive Local Database query - instantly populates stream from IndexedDB
const localMessages = ref<ChatMessage[]>([]);

// Subscribe to live database changes
liveQuery(() => db.messages.orderBy('timestamp').toArray()).subscribe(
  (messages) => {
    localMessages.value = messages;
  }
);

// Helper to auto scroll context down
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// Send message routine
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;

  const userPayload = {
    sender: 'user' as const,
    text: inputMessage.value.trim(),
    timestamp: Date.now()
  };

  // 1. Persist User Message directly to IndexedDB
  await db.messages.add(userPayload);
  inputMessage.value = '';
  scrollToBottom();

  // 2. Simulated Offline/Online Mock AI Handshake
  setTimeout(async () => {
    let aiText = "I'm keeping track of this offline. Once your network restores, I'll deep dive into sync!";
    
    if (isOnline.value) {
      aiText = "That's a stellar question! Let me check the database configuration structures for that chord variation.";
    }

    await db.messages.add({
      sender: 'ai',
      text: aiText,
      timestamp: Date.now()
    });
    scrollToBottom();
  }, 1000);
};

const selectSuggestion = (text: string) => {
  inputMessage.value = text;
  sendMessage();
};

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
/* Optional flexbox wrapper patch ensuring vertical chat stack stretches correctly */
main {
  display: flex;
  flex-direction: column;
}
</style>