<template>
  <div class="flex min-h-screen items-center justify-center bg-[#F3EDE2] p-4 text-[#111111] md:min-h-screen md:p-4 sm:min-h-dvh sm:p-0">
    <div class="relative flex h-[800px] w-full max-w-[390px] flex-col overflow-hidden rounded-[32px] border-[1.5px] border-[#111111] bg-[#FAF6F0] shadow-[0_8px_0_0_#111111] md:h-[800px] sm:h-dvh sm:max-w-full sm:rounded-none sm:border-0 sm:shadow-none">
      
      <Transition name="slide-menu" mode="out-in">
        <SideMenu 
          v-if="isMenuOpen" 
          :current-session-id="currentSessionId"
          @select-session="loadSession"
          @create-new-chat="startNewChat"
          @open-user-config="isUserConfigOpen = true"
          @close="isMenuOpen = false" 
        />
      </Transition>

      <SettingsDialog 
        v-if="isSettingsOpen" 
        v-model:model-name="modelName"
        v-model:service-provider="serviceProvider"
        v-model:system-prompt="systemPrompt"
        :is-locked="localMessages.length > 0"
        @close="isSettingsOpen = false"
      />

      <UserConfigDialog
        v-if="isUserConfigOpen"
        @close="handleConfigDialogClose"
      />

      <div 
        v-if="hasMissingApiKey" 
        class="bg-[#E75A24] text-white text-center text-xs py-1.5 font-bold border-b-[1.5px] border-[#111111] tracking-wide z-10 animate-pulse"
      >
        ⚠️ NO API KEY FOUND — Open Profile to Configure
      </div>
      <div 
        v-else-if="!isOnline" 
        class="bg-[#E75A24] text-white text-center text-xs py-1 font-semibold border-b-[1.5px] border-[#111111] tracking-wide z-10"
      >
        Working Offline
      </div>

      <header class="flex items-center justify-between border-b-[1.5px] border-[#111111] bg-[#FAF6F0] px-4 py-5 flex-shrink-0">
        <button 
          @click="isMenuOpen = true" 
          class="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-[#111111] hover:bg-[#E6DFD3] transition-colors"
          title="Open History"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div class="text-center max-w-[50%]">
          <h2 class="text-[1.05rem] font-bold leading-none truncate">{{ topicTitle }}</h2>
          <p class="text-[0.75rem] text-gray-600 mt-0.5">{{ modelName }}</p>
        </div>

        <button 
          @click="isSettingsOpen = true" 
          class="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-[#111111] bg-[#FAFFA0] hover:shadow-[2px_2px_0_0_#111111] transition-all"
          title="Model Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </header>

      <main ref="chatContainer" class="flex-1 flex flex-col overflow-y-auto bg-[#FAF6F0] p-4 space-y-4">
        <div v-if="localMessages.length === 0" class="rounded-[20px] border-[1.5px] border-[#111111] bg-[#E6DFD3] p-5">
          <h1 class="mb-2 text-2xl font-semibold leading-tight">How can I assist you today? ⚡</h1>
          <p class="text-[0.85rem] leading-relaxed text-gray-800">
            I am your cloud-powered AI assistant, ready to process requests through verified serverless gateways.
          </p>
        </div>

        <div 
          v-for="msg in localMessages" 
          :key="msg.id"
          :class="[
            'max-w-[85%] rounded-[20px] border-[1.5px] border-[#111111] p-3.5 text-[0.9rem] leading-relaxed break-words',
            msg.sender === 'ai' ? 'self-start rounded-tl-none bg-white text-[#111111]' : 'self-end rounded-tr-none bg-[#111111] text-white shadow-[2px_2px_0_0_#000]'
          ]"
        >
          <p class="whitespace-pre-wrap">{{ msg.text }}</p>
        </div>

        <div v-if="isAiThinking" class="self-start rounded-[20px] rounded-tl-none border-[1.5px] border-[#111111] bg-white p-3.5 text-xs font-semibold animate-pulse">
          ⚡ Thinking...
        </div>
      </main>

      <footer class="flex items-center gap-2.5 bg-[#FAF6F0] px-4 pb-6 pt-4 border-t-[1.5px] border-[#111111] flex-shrink-0">
        <div class="relative flex flex-1 items-center">
          <input 
            v-model="inputMessage"
            @keydown.enter="sendMessage"
            type="text" 
            placeholder="Ask me anything..."
            :disabled="hasMissingApiKey || isAiThinking"
            class="w-full rounded-full border-[1.5px] border-[#111111] bg-[#E6DFD3] py-3.5 px-4 text-[0.9rem] font-medium text-[#111111] placeholder-gray-600 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button 
          @click="sendMessage"
          :disabled="hasMissingApiKey || isAiThinking || !inputMessage.trim()"
          class="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[#111111] bg-[#111111] transition-colors hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
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
import { db, type ChatMessage } from '../db';
import { aiProviderService } from '../services/aiProviderService';

import SideMenu from '../components/SideMenu.vue';
import SettingsDialog from '../components/SettingsDialog.vue';
import UserConfigDialog from '../components/UserConfigDialog.vue';

const isOnline = useOnline();
const inputMessage = ref('');
const chatContainer = ref<HTMLElement | null>(null);

const isMenuOpen = ref(false);
const isSettingsOpen = ref(false);
const isUserConfigOpen = ref(false);

const topicTitle = ref('New Chat');
const modelName = ref('Gemma 4 12B');
const serviceProvider = ref('Ollama');
const systemPrompt = ref('You are a helpful local AI assistant. Be concise and accurate.');

const currentSessionId = ref<number | null>(null);
const localMessages = ref<ChatMessage[]>([]);

// Operational validation and state elements
const hasMissingApiKey = ref(false);
const isAiThinking = ref(false);

/**
 * Validates database contents to guarantee active providers hold valid keys
 */
const verifyActiveApiKeyPresence = async () => {
  const targetKeyConfig = serviceProvider.value === 'Ollama' ? 'ollama_api_key' : 'hf_api_key';
  const keyRecord = await db.secureConfig.get(targetKeyConfig);
  
  // If no key record exists, or it has been wiped out empty
  hasMissingApiKey.value = !keyRecord || keyRecord.value.trim() === '';
};

const handleConfigDialogClose = async () => {
  isUserConfigOpen.value = false;
  // Re-verify immediately upon closing settings config container panel
  await verifyActiveApiKeyPresence();
};

// Intercept structural adjustments if service provider changes context
watch(serviceProvider, async () => {
  await verifyActiveApiKeyPresence();
});

watch(systemPrompt, async (newPrompt) => {
  if (currentSessionId.value !== null) {
    await db.sessions.update(currentSessionId.value, { systemPrompt: newPrompt });
  }
});

const subscribeToMessages = (sessionId: number | null) => {
  if (sessionId === null) {
    localMessages.value = [];
    topicTitle.value = 'New Chat';
    return;
  }
  
  db.messages
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp')
    .then((messages) => {
      localMessages.value = messages;
      if (messages.length > 0) {
        const firstUserMsg = messages.find(m => m.sender === 'user');
        topicTitle.value = firstUserMsg ? firstUserMsg.text : 'Current Conversation';
      } else {
        topicTitle.value = 'New Chat';
      }
      scrollToBottom();
    });
};

const startNewChat = () => {
  currentSessionId.value = null;
  modelName.value = 'Gemma 4 12B';
  serviceProvider.value = 'Ollama';
  systemPrompt.value = 'You are a helpful local AI assistant. Be concise and accurate.';
  subscribeToMessages(null);
  verifyActiveApiKeyPresence();
};

const loadSession = (id: number) => {
  currentSessionId.value = id;
  db.sessions.get(id).then((session) => {
    if (session) {
      topicTitle.value = session.title;
      modelName.value = session.modelName;
      serviceProvider.value = session.serviceProvider;
      systemPrompt.value = session.systemPrompt;
      subscribeToMessages(id);
      verifyActiveApiKeyPresence();
    }
  });
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || hasMissingApiKey.value || isAiThinking.value) return;
  
  const userText = inputMessage.value.trim();
  
  // 1. If this is a brand new chat, initialize the session
  if (currentSessionId.value === null) {
    const newSessionId = await db.sessions.add({
      title: userText,
      createdAt: Date.now(),
      modelName: modelName.value,
      serviceProvider: serviceProvider.value,
      systemPrompt: systemPrompt.value
    });
    currentSessionId.value = newSessionId;
    topicTitle.value = userText;
  }

  // 2. Build the new message object
  const userPayload: ChatMessage = {
    sessionId: currentSessionId.value!,
    sender: 'user',
    text: userText,
    timestamp: Date.now()
  };
  
  // 3. OPTIMISTIC PAYLOAD CONSTRUCTION
  // Convert your current visible messages list to the API role format,
  // and manually append the new user message. This bypasses the DB timing lag!
  const optimizedHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    ...localMessages.value.map(m => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text
    })),
    { role: 'user' as const, content: userText } // Enforces inclusion of current prompt
  ];

  // Prepend the baseline system instructions to the start of our memory payload
  optimizedHistory.unshift({
    role: 'system',
    content: systemPrompt.value
  });

  // 4. Fire off IndexedDB write in the background and reset input string
  await db.messages.add(userPayload);
  inputMessage.value = '';
  subscribeToMessages(currentSessionId.value);
  
  // Set UI operational processing flags
  isAiThinking.value = true;
  scrollToBottom();

  try {
    // 5. Send our manually built history array down to your client service
    const aiTextReply = await aiProviderService.generateChatResponse(
      serviceProvider.value,
      modelName.value,
      optimizedHistory // 🌟 Always contains the true current prompt
    );

    // 6. Save the AI response back to your local IndexedDB
    if (currentSessionId.value !== null) {
      await db.messages.add({
        sessionId: currentSessionId.value!,
        sender: 'ai',
        text: aiTextReply,
        timestamp: Date.now()
      });
    }
  } catch (error: any) {
    console.error('Inference error encountered:', error);
    if (currentSessionId.value !== null) {
      await db.messages.add({
        sessionId: currentSessionId.value!,
        sender: 'ai',
        text: `❌ Gateway Error: ${error.message || 'Failed to capture serverless proxy payload. Make sure your Express server is running on Port 5000.'}`,
        timestamp: Date.now()
      });
    }
  } finally {
    isAiThinking.value = false;
    subscribeToMessages(currentSessionId.value);
    scrollToBottom();
  }
};

onMounted(() => {
  startNewChat();
});
</script>

<style scoped>
.slide-menu-enter-active, .slide-menu-leave-active { 
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-menu-enter-from, .slide-menu-leave-to { opacity: 0; }
</style>