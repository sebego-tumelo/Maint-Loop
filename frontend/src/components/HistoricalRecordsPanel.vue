<script setup>
import { ref, computed } from 'vue';
import { History, ArrowUpDown, ChevronDown, ChevronUp, Trophy } from 'lucide-vue-next';
import LottoBall from './LottoBall.vue';
import { formatZAR, formatSignedZAR } from '../utils/lottoEngine';

const props = defineProps({
  draws: {
    type: Array,
    required: true,
  },
  predictions: {
    type: Array,
    required: true,
  },
});

const activeTab = ref('draws'); // 'draws' | 'predictions'
const sortOrder = ref('newest'); // 'newest' | 'oldest'
const expandedDrawId = ref(null);
const expandedPredictionId = ref(null);

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'newest' ? 'oldest' : 'newest';
};

const sortedDraws = computed(() => {
  return [...props.draws].sort((a, b) => {
    return sortOrder.value === 'newest'
      ? b.drawNumber - a.drawNumber
      : a.drawNumber - b.drawNumber;
  });
});

const sortedPredictions = computed(() => {
  return [...props.predictions].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder.value === 'newest' ? dateB - dateA : dateA - dateB;
  });
});

const toggleDrawExpand = (id) => {
  expandedDrawId.value = expandedDrawId.value === id ? null : id;
};

const togglePredictionExpand = (id) => {
  expandedPredictionId.value = expandedPredictionId.value === id ? null : id;
};

// Color mapping based on decade
const getDecadeVariant = (num) => {
  if (num <= 9) return 'peach';
  if (num <= 19) return 'mint';
  if (num <= 29) return 'lavender';
  return 'rose';
};
</script>

<template>
  <section
    id="section-historical-records"
    class="w-full bg-white rounded-[24px] p-4 border border-ui-charcoal space-y-4 transition-all"
  >
    <!-- Panel Title -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-[16px] bg-metric-lavender border border-ui-charcoal flex items-center justify-center text-ui-charcoal">
          <History class="w-4 h-4" />
        </div>
        <div>
          <h2 class="ui-heading text-xs tracking-wider text-ui-charcoal">
            HISTORICAL LOGS
          </h2>
          <p class="ui-body text-[10px] text-ui-charcoal/70">
            SA Daily Lotto archives
          </p>
        </div>
      </div>

      <button
        id="btn-toggle-sort-order"
        @click="toggleSort"
        class="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-canvas-peach/50 hover:bg-canvas-peach border border-ui-charcoal transition-all cursor-pointer"
      >
        <ArrowUpDown class="w-3 h-3" />
        <span>{{ sortOrder === 'newest' ? 'Newest' : 'Oldest' }}</span>
      </button>
    </div>

    <!-- Pill Tab Switcher -->
    <div class="flex items-center justify-between gap-1 p-1 rounded-[24px] bg-canvas-peach/30 border border-ui-charcoal">
      <button
        id="tab-btn-draws"
        @click="activeTab = 'draws'"
        :class="[
          'flex-1 py-2 px-3 rounded-[20px] text-xs font-black transition-all cursor-pointer text-center',
          activeTab === 'draws'
            ? 'bg-ui-charcoal text-white'
            : 'text-ui-charcoal/70 hover:text-ui-charcoal'
        ]"
      >
        Draws ({{ draws.length }})
      </button>
      <button
        id="tab-btn-predictions"
        @click="activeTab = 'predictions'"
        :class="[
          'flex-1 py-2 px-3 rounded-[20px] text-xs font-black transition-all cursor-pointer text-center',
          activeTab === 'predictions'
            ? 'bg-ui-charcoal text-white'
            : 'text-ui-charcoal/70 hover:text-ui-charcoal'
        ]"
      >
        Predictions ({{ predictions.length }})
      </button>
    </div>

    <!-- Content: Draw Archive -->
    <div v-if="activeTab === 'draws'" id="tab-content-draws" class="space-y-3 max-h-[440px] overflow-y-auto pr-1">
      <div
        v-for="draw in sortedDraws"
        :key="draw.id"
        class="p-4 rounded-[24px] bg-canvas-peach/20 border border-ui-charcoal"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="ui-heading text-xs text-ui-charcoal">
              Draw #{{ draw.drawNumber }}
            </span>
            <span class="text-[10px] font-semibold text-ui-charcoal/70">
              {{ draw.date }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="ui-heading text-xs text-ui-charcoal">
              {{ formatZAR(draw.prizePool) }}
            </span>
            <button
              @click="toggleDrawExpand(draw.id)"
              class="p-1.5 rounded-full bg-white hover:bg-canvas-peach border border-ui-charcoal transition-all"
            >
              <ChevronUp v-if="expandedDrawId === draw.id" class="w-3 h-3" />
              <ChevronDown v-else class="w-3 h-3" />
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-1.5 py-1">
          <LottoBall
            v-for="(num, bIdx) in draw.winningNumbers"
            :key="`hist-draw-${draw.id}-${num}`"
            :number="num"
            size="sm"
            :variant="getDecadeVariant(num)"
          />
        </div>

        <div
          v-if="expandedDrawId === draw.id"
          class="mt-3 pt-3 border-t border-ui-charcoal/20 text-[10px] space-y-1.5"
        >
          <div
            v-for="div in draw.divisions"
            :key="div.match"
            class="flex items-center justify-between text-ui-charcoal px-1"
          >
            <span class="ui-body">Match {{ div.match }} ({{ div.winners }} winners)</span>
            <span class="ui-heading">{{ formatZAR(div.payout) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content: Prediction Log -->
    <div v-else id="tab-content-predictions" class="space-y-3 max-h-[440px] overflow-y-auto pr-1">
      <div
        v-for="pred in sortedPredictions"
        :key="pred.id"
        class="p-4 rounded-[24px] bg-canvas-peach/20 border border-ui-charcoal"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="ui-heading text-xs text-ui-charcoal">
              {{ pred.targetDrawDate }}
            </span>
            <span class="text-[10px] font-bold text-ui-charcoal/70 bg-white px-2 py-0.5 rounded-full border border-ui-charcoal">
              {{ pred.sets.length }} Boards
            </span>
          </div>

          <div class="flex items-center gap-2">
            <template v-if="pred.status === 'evaluated'">
              <span
                :class="[
                  'text-[10px] ui-heading px-2.5 py-0.5 rounded-full border border-ui-charcoal',
                  pred.netProfit >= 0
                    ? 'bg-metric-mint'
                    : 'bg-metric-salmon'
                ]"
              >
                {{ formatSignedZAR(pred.netProfit) }}
              </span>
            </template>
            <template v-else>
              <span class="text-[10px] ui-heading px-2.5 py-0.5 rounded-full bg-nav-sand border border-ui-charcoal">
                Pending
              </span>
            </template>
          </div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-ui-charcoal/80 font-bold">
          <span>Cost: {{ formatZAR(pred.cost) }} | Won: {{ formatZAR(pred.totalWon) }}</span>
          <div class="flex items-center gap-2">
            <span class="ui-heading text-ui-charcoal">
              {{ pred.topMatchCount > 0 ? `Best: ${pred.topMatchCount}m` : '0m' }}
            </span>
            <button
              @click="togglePredictionExpand(pred.id)"
              class="p-1.5 rounded-full bg-white hover:bg-canvas-peach border border-ui-charcoal transition-all"
            >
              <ChevronUp v-if="expandedPredictionId === pred.id" class="w-3 h-3" />
              <ChevronDown v-else class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Expanded Sets List -->
        <div
          v-if="expandedPredictionId === pred.id"
          class="mt-3 pt-3 border-t border-ui-charcoal/20 space-y-2"
        >
          <div
            v-for="(set, sIdx) in pred.sets"
            :key="set.id"
            class="p-3 rounded-[16px] bg-white border border-ui-charcoal"
          >
            <div class="flex items-center justify-between text-[10px]">
              <span class="ui-heading text-ui-charcoal">Set #{{ set.setNumber || sIdx + 1 }}</span>
              <span class="text-ui-charcoal font-black">
                {{ (set.matchedNumbers?.length || 0) > 0
                  ? `${set.matchedNumbers.length} Matched (${formatZAR(set.winAmount || 0)})`
                  : '0 Matches' }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-1.5 mt-2">
              <LottoBall
                v-for="num in set.numbers"
                :key="`hist-set-ball-${sIdx}-${num}`"
                :number="num"
                size="sm"
                :isMatched="set.matchedNumbers?.includes(num)"
                :variant="set.matchedNumbers?.includes(num) ? 'gold' : getDecadeVariant(num)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

