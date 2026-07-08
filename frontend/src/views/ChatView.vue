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

      <UserConfigDialog
        v-if="isUserConfigOpen"
        @close="handleConfigDialogClose"
      />

      <div 
        v-if="!isOnline" 
        class="bg-[#E75A24] text-white text-center text-xs py-1 font-semibold border-b-[1.5px] border-[#111111] tracking-wide z-10"
      >
        Working Offline
      </div>
      <div 
        v-else-if="needRefresh" 
        class="bg-[#E75A24] text-white text-center text-xs py-1 font-semibold border-b-[1.5px] border-[#111111] tracking-wide z-10"
      >
        🚀 A new update is available for localChat
        <button 
          @click="refreshApp" 
          class="bg-white text-amber-600 px-3 py-1 rounded-md text-xs font-bold hover:bg-gray-100 transition shadow-sm"
        >
          Update Now
        </button>
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

        <div class="text-center max-w-[70%]">
          <h2 class="text-[1.05rem] font-bold leading-none truncate">{{ topicTitle }}</h2>
          <p class="text-[0.75rem] text-gray-600 mt-0.5">{{ modelName }}</p>
        </div>

        <div class="w-10 h-10"></div>
      </header>

      <main ref="chatContainer" class="flex-1 flex flex-col overflow-y-auto bg-[#FAF6F0] p-4 space-y-4">
        <div v-if="localMessages.length === 0" class="rounded-[20px] border-[1.5px] border-[#111111] bg-[#E6DFD3] p-5">
          <h1 class="mb-2 text-2xl font-semibold leading-tight">How can I assist you today?</h1>
          <p class="text-[0.85rem] leading-relaxed text-gray-800">
            I am your cloud-powered AI assistant, ready to process requests through verified serverless gateways.
          </p>
        </div>

        <div v-for="message in localMessages" :key="message.id" :class="['max-w-[85%] rounded-[20px] border-[1.5px] border-[#111111] p-3.5 text-[0.9rem] leading-relaxed break-words', message.sender === 'ai' ? 'self-start rounded-tl-none bg-white text-[#111111]' : 'self-end rounded-tr-none bg-[#111111] text-white shadow-[2px_2px_0_0_#000]']">
          <div>
            <div v-if="message.text === 'Thinking...'" class="flex items-center gap-1 text-gray-500 italic">
              <span>Thinking</span>
              <span class="animate-pulse">...</span>
            </div>
            <div v-else v-html="formatMarkdown(message.text || '')"></div>
          </div>
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
            :disabled="isAiThinking"
            class="w-full rounded-full border-[1.5px] border-[#111111] bg-[#E6DFD3] py-3.5 px-4 text-[0.9rem] font-medium text-[#111111] placeholder-gray-600 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button 
          @click="sendMessage"
          :disabled="isAiThinking || !inputMessage.trim()"
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

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useOnline } from '@vueuse/core';
import { db } from '../db';

import SideMenu from '../components/SideMenu.vue';
import UserConfigDialog from '../components/UserConfigDialog.vue';

import { marked } from 'marked';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW();

const refreshApp = () => {
  updateServiceWorker(true);
};

const isOnline = useOnline();
const inputMessage = ref('');
const chatContainer = ref(null);

const isMenuOpen = ref(false);
const isUserConfigOpen = ref(false);
const topicTitle = ref('New Chat');
const modelName = ref('gemma4:31b');
const serviceProvider = ref('Ollama');
const systemPrompt = ref('You are a helpful local AI assistant. Be concise and accurate.');

const currentSessionId = ref(null);
const localMessages = ref([]);

const isAiThinking = ref(false);

marked.setOptions({
  gfm: true,
  breaks: true
});

const formatMarkdown = (rawText) => {
  if (!rawText) return '';
  try {
    return marked.parse(rawText);
  } catch (error) {
    console.error('Markdown rendering engine failed:', error);
    return rawText;
  }
};

const handleConfigDialogClose = async () => {
  isUserConfigOpen.value = false;
};

watch(systemPrompt, async (newPrompt) => {
  if (currentSessionId.value !== null) {
    await db.sessions.update(currentSessionId.value, { systemPrompt: newPrompt });
  }
});

const applyFormatting = (text) => {
  if (!text) return text;

  // Try to find the JSON-like structure - made non-greedy
 const jsonMatch = text.match(/\{[\s\S]*?\n\}/);
 
  if (jsonMatch) {
    try {
      // Validate that it's actually parsable JSON
      const jsonObject = JSON.parse(jsonMatch[0]);
      
      // Ensure it's the specific structure we expect
      if (jsonObject.suggested_numbers && jsonObject.strategy_metrics) {
        const formattedJson = formatLotteryResponse(jsonObject);
        if (formattedJson) {
          const reasoning = text.replace(jsonMatch[0], '').trim();
          return formattedJson + (reasoning ? '\n\n---\n\n' + reasoning : '');
        }
      }
    } catch (e) {
      // Not valid JSON, just ignore and return original text
      console.warn("Match found but not valid JSON, skipping formatting.");
    }
  }
  return text;
};

const subscribeToMessages = (sessionId) => {
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
      // Apply formatting to historical AI messages
      localMessages.value = messages.map(m => ({
        ...m,
        text: m.sender === 'ai' ? applyFormatting(m.text) : m.text
      }));
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
  serviceProvider.value = 'Ollama';
  modelName.value = 'gemma4:31b';
  systemPrompt.value = 'You are a helpful local AI assistant. Be concise and accurate.';
  subscribeToMessages(null);
};

const loadSession = (id) => {
  currentSessionId.value = id;
  db.sessions.get(id).then((session) => {
    if (session) {
      topicTitle.value = session.title;
      modelName.value = session.modelName;
      serviceProvider.value = session.serviceProvider;
      systemPrompt.value = session.systemPrompt;
      subscribeToMessages(id);
    }
  });
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const formatLotteryResponse = (json) => {
  console.log("Formatting lottery response:", json);
  if (!json.suggested_numbers || !json.strategy_metrics) return null;
  
  let output = `suggested numbers : ${json.suggested_numbers.join(', ')}\n`;
  output += `strategic_metric:\n`;
  for (const [key, value] of Object.entries(json.strategy_metrics)) {
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    output += `  ${key} : ${displayValue}\n`;
  }
  return output;
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isAiThinking.value) return;
  
  const userText = inputMessage.value.trim();
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

  const userPayload = {
    sessionId: currentSessionId.value,
    sender: 'user',
    text: userText,
    timestamp: Date.now()
  };

  await db.messages.add(userPayload);
  inputMessage.value = '';
  localMessages.value.push(userPayload);

  const aiIndex = localMessages.value.push({
    sessionId: currentSessionId.value,
    sender: 'ai',
    text: 'Thinking...', 
    timestamp: Date.now()
  }) - 1;

  scrollToBottom();
  isAiThinking.value = true;
  try {
    const baseUrl = import.meta.env.DEV 
      ? `https://${window.location.hostname.replace('-5173.', '-3000.')}` 
      : '';
      
    const response = await fetch(`${baseUrl}/run-instruction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instruction: userText })
    });

    if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // Keep the last incomplete part in buffer
      
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.replace('data: ', ''));
          
          if (data.type === 'token') {
            if (aiResponse === '') {
              aiResponse = data.text;
            } else {
              aiResponse += data.text;
            }
            // Update UI
            localMessages.value[aiIndex].text = aiResponse;
            scrollToBottom();
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        }
      }
    }
    
    // Final update after full stream
    const finalDisplay = applyFormatting(aiResponse);
    localMessages.value[aiIndex].text = finalDisplay;

    await db.messages.add({
      sessionId: currentSessionId.value,
      sender: 'ai',
      text: finalDisplay,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Inference streaming error encountered:', error);
    const errorText = `❌ Gateway Error: ${error.message || 'Stream interrupted.'}`;
    
    localMessages.value[aiIndex].text = errorText;

    await db.messages.add({
      sessionId: currentSessionId.value,
      sender: 'ai',
      text: errorText,
      timestamp: Date.now()
    });
  } finally {
    isAiThinking.value = false;
    subscribeToMessages(currentSessionId.value);
    scrollToBottom();
  }
};

onMounted(async () => {
  const sessions = await db.sessions.toArray();
  if (sessions.length > 0) {
    const latest = sessions.sort((a,b) => b.createdAt - a.createdAt)[0];
    loadSession(latest.id);
  } else {
    startNewChat();
  }
});
</script>

<style scoped>
.slide-menu-enter-active, .slide-menu-leave-active { 
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-menu-enter-from, .slide-menu-leave-to { opacity: 0; }

:deep(p:last-child) { margin-bottom: 0; }
:deep(strong) { font-weight: 700; color: #111111; }
:deep(ul) { list-style-type: disc; margin-left: 1.25rem; margin-bottom: 0.5rem; }
:deep(ol) { list-style-type: decimal; margin-left: 1.25rem; margin-bottom: 0.5rem; }
</style>