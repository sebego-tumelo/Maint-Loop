<script setup>
import { ref, watch } from 'vue';
import {
  Sparkles,
  Zap,
  RotateCcw,
  Check,
  Cpu,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-vue-next';
import confetti from 'canvas-confetti';
import LottoBall from './LottoBall.vue';
import {
  BOARD_PRICE_ZAR,
  generatePredictionBoards,
  generateCandidateSet,
  formatZAR,
} from '../utils/lottoEngine';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  targetDrawDate: {
    type: String,
    required: true,
  },
  onClose: {
    type: Function,
    required: true,
  },
  onSavePrediction: {
    type: Function,
    required: true,
  },
});

const step = ref('config'); // 'config' | 'analyzing' | 'complete'
const boardCount = ref(3);
const strategy = ref('balanced');
const analysisProgress = ref(0);
const analysisMessage = ref('Initializing historical pattern engine...');
const generatedSets = ref([]);

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      step.value = 'config';
      analysisProgress.value = 0;
      generatedSets.value = [];
    }
  }
);

const handleStartGeneration = () => {
  step.value = 'analyzing';
  analysisProgress.value = 10;
  analysisMessage.value = 'Scanning 5/36 frequency matrix & hot numbers...';

  const t1 = setTimeout(() => {
    analysisProgress.value = 45;
    analysisMessage.value = 'Calculating combinatoric delta & odd/even balance...';
  }, 450);

  const t2 = setTimeout(() => {
    analysisProgress.value = 80;
    analysisMessage.value = 'Optimizing 3-board synergy to maximize coverage...';
  }, 950);

  const t3 = setTimeout(() => {
    analysisProgress.value = 100;
    analysisMessage.value = 'Prediction complete!';

    // Generate real candidate boards
    const sets = generatePredictionBoards(boardCount.value);
    generatedSets.value = sets;
    step.value = 'complete';

    // Celebration confetti
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#F6BD51', '#FFB59E', '#B7E1D2', '#D2CFF7'],
      });
    } catch {
      // Ignore if canvas unavailable
    }
  }, 1450);
};

const handleRegenerateSingleSet = (setIdx) => {
  const newSet = generateCandidateSet(setIdx + 1, strategy.value);
  const updated = [...generatedSets.value];
  updated[setIdx] = newSet;
  generatedSets.value = updated;
};

const handleDone = () => {
  const newPredictionRecord = {
    id: `pred-${Date.now()}`,
    createdAt: new Date().toISOString(),
    targetDrawDate: props.targetDrawDate,
    boardsCount: boardCount.value,
    cost: boardCount.value * BOARD_PRICE_ZAR,
    sets: generatedSets.value,
    status: 'pending',
    totalWon: 0,
    netProfit: -(boardCount.value * BOARD_PRICE_ZAR),
    topMatchCount: 0,
  };

  props.onSavePrediction(newPredictionRecord);
  props.onClose();
  step.value = 'config';
};

const handleCloseModal = () => {
  props.onClose();
  step.value = 'config';
};
</script>

<template>
  <div
    v-if="isOpen"
    id="modal-predict-next-draw"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div
      id="modal-predict-container"
      class="w-full max-w-md bg-white border border-ui-charcoal rounded-[24px] shadow-xl p-5 relative overflow-hidden flex flex-col max-h-[90vh] text-ui-charcoal"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-ui-charcoal/20 mb-3.5">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-[16px] bg-metric-mint border border-ui-charcoal flex items-center justify-center text-ui-charcoal">
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <h3 class="ui-heading text-xs tracking-wider text-ui-charcoal">
              AI PREDICTION GENERATOR
            </h3>
            <p class="ui-body text-[10px] text-ui-charcoal/70">
              Target: <span class="font-black">{{ targetDrawDate }}</span>
            </p>
          </div>
        </div>

        <button
          id="btn-close-predict-modal"
          @click="handleCloseModal"
          class="p-1 rounded-full text-ui-charcoal/70 hover:text-ui-charcoal hover:bg-canvas-peach transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Step 1: Configuration Form -->
      <div v-if="step === 'config'" id="predict-step-config" class="space-y-4 my-1">
        <!-- Number of Boards Selector -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="ui-heading text-[11px] text-ui-charcoal tracking-wide">
              Board Count Allocation
            </label>
            <span class="ui-heading text-xs text-ui-charcoal">
              {{ boardCount }} Boards ({{ formatZAR(boardCount * BOARD_PRICE_ZAR) }})
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="num in [1, 3, 5]"
              :key="num"
              :id="`btn-select-board-count-${num}`"
              type="button"
              @click="boardCount = num"
              :class="[
                'py-2 rounded-[16px] text-xs ui-heading transition-all border cursor-pointer',
                boardCount === num
                  ? 'bg-ui-charcoal text-white border-ui-charcoal'
                  : 'bg-canvas-peach/30 hover:bg-canvas-peach text-ui-charcoal/70 border-ui-charcoal'
              ]"
            >
              {{ num }} Board{{ num > 1 ? 's' : '' }}
            </button>
          </div>
        </div>

        <!-- Strategy Selection -->
        <div class="p-4 rounded-[24px] bg-canvas-peach/30 border border-ui-charcoal space-y-3">
          <label class="ui-heading text-[11px] text-ui-charcoal flex items-center gap-1.5">
            <Cpu class="w-3.5 h-3.5" />
            <span>Optimization Heuristic</span>
          </label>

          <div class="space-y-2 text-xs">
            <button
              v-for="strat in [
                { id: 'balanced', name: 'Balanced Frequency', desc: 'Combines hot 30-day pairs with cold resurgence' },
                { id: 'hot', name: 'Hot Velocity Cluster', desc: 'Prioritizes highest rolling 7-day draw frequencies' },
                { id: 'frequency', name: 'Low Delta Distribution', desc: 'Even dispersion across 1-36 decade blocks' },
              ]"
              :key="strat.id"
              :id="`btn-strategy-${strat.id}`"
              type="button"
              @click="strategy = strat.id"
              :class="[
                'w-full p-3 rounded-[16px] text-left transition-all border cursor-pointer',
                strategy === strat.id
                  ? 'bg-white border-ui-charcoal shadow-sm'
                  : 'bg-white/50 hover:bg-white border-ui-charcoal/20'
              ]"
            >
              <div class="ui-heading text-[11px] text-ui-charcoal">{{ strat.name }}</div>
              <div class="ui-body text-[10px] text-ui-charcoal/70">{{ strat.desc }}</div>
            </button>
          </div>
        </div>

        <!-- Generate Action Button -->
        <button
          id="btn-execute-generation"
          @click="handleStartGeneration"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[24px] bg-nav-sand hover:bg-nav-sand/90 text-ui-charcoal font-black text-xs uppercase tracking-wider border border-ui-charcoal transition-all active:scale-95"
        >
          <Zap class="w-4 h-4" />
          <span>Execute AI Prediction</span>
        </button>
      </div>

      <!-- Step 2: Analyzing -->
      <div
        v-if="step === 'analyzing'"
        id="predict-step-analyzing"
        class="py-8 px-2 flex flex-col items-center justify-center text-center space-y-4"
      >
        <div class="relative flex items-center justify-center w-16 h-16 rounded-[24px] bg-canvas-peach/30 border border-ui-charcoal">
          <Loader2 class="w-8 h-8 text-ui-charcoal animate-spin" />
        </div>

        <div class="space-y-1 max-w-xs">
          <h4 class="ui-heading text-xs text-ui-charcoal">
            Running Algorithmic Simulation
          </h4>
          <p class="ui-body text-[11px] text-ui-charcoal/70">
            {{ analysisMessage }}
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-canvas-peach/30 rounded-full h-3 p-0.5 border border-ui-charcoal">
          <div
            class="bg-metric-orange h-full transition-all duration-300 rounded-full"
            :style="{ width: `${analysisProgress}%` }"
          />
        </div>
      </div>

      <!-- Step 3: Complete -->
      <div
        v-if="step === 'complete'"
        id="predict-step-complete"
        class="space-y-4 my-1 flex flex-col"
      >
        <div class="flex items-center justify-between p-3 rounded-[24px] bg-metric-mint border border-ui-charcoal text-ui-charcoal text-xs ui-heading">
          <span class="flex items-center gap-1.5">
            <CheckCircle2 class="w-4 h-4" />
            <span>{{ generatedSets.length }} Candidates locked!</span>
          </span>
          <span>{{ formatZAR(boardCount * BOARD_PRICE_ZAR) }}</span>
        </div>

        <!-- Candidates -->
        <div class="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          <div
            v-for="(set, idx) in generatedSets"
            :key="set.id"
            :id="`generated-board-${idx + 1}`"
            class="p-4 rounded-[24px] bg-canvas-peach/20 border border-ui-charcoal space-y-3"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="ui-heading text-ui-charcoal">Board #{{ set.setNumber || idx + 1 }}</span>
              <span class="text-[10px] font-bold text-ui-charcoal bg-white px-2 py-0.5 rounded-full border border-ui-charcoal">
                Synergy: <strong class="ui-heading">{{ set.confidenceScore }}%</strong>
              </span>
            </div>

            <div class="flex items-center justify-between gap-1.5">
              <LottoBall
                v-for="(num, bIdx) in set.numbers"
                :key="`gen-ball-${idx}-${num}`"
                :number="num"
                size="md"
                :variant="bIdx === 0 ? 'peach' : bIdx === 1 ? 'mint' : bIdx === 2 ? 'lavender' : bIdx === 3 ? 'rose' : 'gold'"
              />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button
            id="btn-re-generate-all"
            @click="handleStartGeneration"
            class="flex items-center justify-center gap-1.5 py-3 px-3 rounded-[24px] bg-canvas-peach/50 hover:bg-canvas-peach text-ui-charcoal font-bold text-xs border border-ui-charcoal transition-all"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Reroll All</span>
          </button>

          <button
            id="btn-done-prediction"
            @click="handleDone"
            class="flex items-center justify-center gap-1.5 py-3 px-3 rounded-[24px] bg-nav-sand hover:bg-nav-sand/90 text-ui-charcoal font-black text-xs border border-ui-charcoal transition-all"
          >
            <Check class="w-4 h-4" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

