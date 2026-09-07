<script setup>
import { ref } from 'vue';
import { X, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  isOpen: Boolean,
  onClose: Function
});

const jsonInput = ref('');
const apiKey = ref('');
const status = ref(''); // 'idle', 'loading', 'success', 'error'
const message = ref('');

const submitIngest = async () => {
  status.value = 'loading';
  message.value = 'Processing...';

  try {
    const response = await fetch('/api/manual-ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.value
      },
      body: jsonInput.value
    });

    const result = await response.json();

    if (response.ok) {
      status.value = 'success';
      message.value = result.message;
      jsonInput.value = ''; // clear
    } else {
      status.value = 'error';
      message.value = result.error || 'Failed to ingest';
    }
  } catch (err) {
    status.value = 'error';
    message.value = 'Network error: ' + err.message;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ui-charcoal/80">
    <div class="bg-nav-sand w-full max-w-sm rounded-[24px] border-2 border-ui-charcoal p-6 shadow-[4px_4px_0_0_#111111]">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold flex items-center gap-2">
            <Upload class="w-5 h-5"/> Manual Ingest
        </h2>
        <button @click="onClose" class="p-1 hover:bg-black/10 rounded-full">
          <X class="w-6 h-6" />
        </button>
      </div>

      <input 
        v-model="apiKey"
        type="password"
        placeholder="API Key"
        class="w-full p-3 mb-4 rounded-xl border border-ui-charcoal bg-white"
      />

      <textarea
        v-model="jsonInput"
        placeholder="Paste JSON response here..."
        class="w-full h-40 p-3 mb-4 rounded-xl border border-ui-charcoal bg-white text-xs font-mono"
      ></textarea>

      <button
        @click="submitIngest"
        :disabled="status === 'loading'"
        class="w-full bg-ui-charcoal text-nav-sand font-bold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <Loader2 v-if="status === 'loading'" class="w-5 h-5 animate-spin" />
        <span v-else>Submit Data</span>
      </button>

      <div v-if="status === 'success'" class="mt-4 p-3 rounded-xl bg-green-100 text-green-800 text-sm flex items-center gap-2">
        <CheckCircle class="w-4 h-4" /> {{ message }}
      </div>
      <div v-if="status === 'error'" class="mt-4 p-3 rounded-xl bg-red-100 text-red-800 text-sm flex items-center gap-2">
        <AlertTriangle class="w-4 h-4" /> {{ message }}
      </div>
    </div>
  </div>
</template>
