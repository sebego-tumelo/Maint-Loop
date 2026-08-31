<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useLottoStore } from '../stores/lottoStore';
import { Dices, Info, Sparkles, BatteryCharging, Radio, ChevronRight, Loader2 } from 'lucide-vue-next';
import LatestDrawPanel from './LatestDrawPanel.vue';

const store = useLottoStore();
const { latestResult: draw, latestMatchedNumbers: matchedNumbers } = storeToRefs(store);

defineProps({
  isUpdating: {
    type: Boolean,
    default: false,
  },
  onOpenPredictModal: {
    type: Function,
    required: true,
  },
  onOpenSimulateModal: {
    type: Function,
    required: true,
  },
  onOpenPrizeInfoModal: {
    type: Function,
    required: true,
  },
});

const date = new Date();
const currentDate = ref(date.getDate());
const currentDay = ref(date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase());
</script>

<template>
  <header id="section-home" class="w-full bg-nav-sand text-ui-charcoal pt-2.5 pb-4 px-4 rounded-b-[24px] border-b border-ui-charcoal relative z-20">
    <!-- ... (rest of template remains largely same but draws from local 'draw' and 'matchedNumbers') -->
    <!-- Empty placeholder to maintain status bar vertical space -->
    <div class="h-[16px] mb-2"></div>

    <!-- Main Title Header -->
    <div class="flex items-center justify-between gap-2 max-w-lg mx-auto mb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-ui-charcoal text-nav-sand flex items-center justify-center font-black text-sm">
          {{ currentDate }}
        </div>
        <div>
          <h1 class="ui-heading text-lg tracking-wider text-ui-charcoal">
            {{ currentDay }}
          </h1>
        </div>
      </div>

      <!-- Header actions (Test Draw & Rules) -->
      <div class="flex items-center gap-1.5">
        <button
          id="btn-simulate-draw-quick"
          @click="onOpenSimulateModal"
          title="Simulate Draw"
          class="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-white hover:bg-white/90 text-ui-charcoal border border-ui-charcoal transition-all active:scale-95"
        >
          <Dices class="w-3.5 h-3.5 text-ui-charcoal" />
          <span>Simulate</span>
        </button>

        <button
          id="btn-open-rules-info"
          @click="onOpenPrizeInfoModal"
          title="Daily Lotto Rules & Payout Structure"
          class="p-1.5 rounded-full bg-white hover:bg-white/90 text-ui-charcoal border border-ui-charcoal transition-all active:scale-95"
        >
          <Info class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Latest Draw Panel -->
    <div class="mt-3">
      <LatestDrawPanel :draw="draw" :isUpdating="isUpdating" :matchedNumbers="matchedNumbers" />
    </div>
  </header>
</template>

