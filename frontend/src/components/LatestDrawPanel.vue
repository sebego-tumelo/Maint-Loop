<script setup>
import { ref } from 'vue';
import { Trophy, Calendar, ChevronDown, ChevronUp, Sparkles, Award, Loader2 } from 'lucide-vue-next';
import LottoBall from './LottoBall.vue';
import { formatZAR } from '../utils/lottoEngine';

const props = defineProps({
  draw: {
    type: Object,
    default: null,
  },
  isUpdating: {
    type: Boolean,
    default: false,
  },
  matchedNumbers: {
    type: Array,
    default: () => [],
  },
});

const isDropdownOpen = ref(false);
</script>

<template>
  <section
    v-if="!draw"
    id="section-latest-draw"
    class="w-full rounded-[24px] p-4 bg-canvas-peach/20 border border-ui-charcoal text-center text-ui-charcoal/70 text-xs"
  >
    No draw results available.
  </section>
  <section
    v-else
    id="section-latest-draw"
    :class="[
      'w-full rounded-[24px] p-4 space-y-4 transition-all',
      isUpdating ? 'bg-metric-mint/20' : ''
    ]"
  >
    <!-- Top Header mimicking the Insights section from reference image -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        
        <div>
          <h2 class="ui-heading text-xs tracking-wider text-ui-charcoal">
            {{ isUpdating ? 'UPDATING...' : 'OFFICIAL DRAW' }}
          </h2>
          <p class="ui-body text-[10px] text-ui-charcoal/70">
            {{ draw.drawDate }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <span 
          :class="[
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-ui-charcoal',
            isUpdating ? 'bg-white' : 'bg-metric-mint'
          ]"
        >
          <Loader2 v-if="isUpdating" class="w-3 h-3 animate-spin text-ui-charcoal" />
          <span v-else class="w-1.5 h-1.5 rounded-full bg-ui-charcoal"></span>
          {{ isUpdating ? 'Fetching latest...' : 'Latest Result' }}
        </span>
      </div>
    </div>

    <!-- Winning Numbers Display -->
    <div class="p-4 rounded-[24px] flex flex-col items-center justify-center">
      <div class="text-[10px] uppercase font-extrabold tracking-wider text-ui-charcoal/70 mb-3 flex items-center gap-1.5">
        
        <span>Winning Number Combination</span>
      </div>
      
      <div class="flex items-center justify-center gap-2 flex-wrap">
        <LottoBall
          v-for="num in draw.winningNumbers"
          :key="`win-ball-${num}`"
          :id="`ball-win-${num}`"
          :number="num"
          size="lg"
          variant="default"
          :isMatched="matchedNumbers?.includes(num)"
        />
      </div>

      <!-- Estimated Prize Pool Pill -->
      <div v-if="draw.prizePool" class="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-ui-charcoal text-[11px] font-bold text-ui-charcoal">
        <span class="text-ui-charcoal/70">Estimated Pool:</span>
        <span class="ui-heading text-ui-charcoal">{{ formatZAR(draw.prizePool) }}</span>
      </div>
    </div>

    <!-- Prize Breakdown Dropdown -->
    <div>
      <button
        id="btn-toggle-prize-divisions"
        @click="isDropdownOpen = !isDropdownOpen"
        class="w-full flex items-center justify-between px-4 py-3 text-xs font-bold rounded-[24px] bg-canvas-peach/30 hover:bg-canvas-peach/50 text-ui-charcoal border border-ui-charcoal transition-all"
      >
        <span class="flex items-center gap-1.5 ui-body">
          <Trophy class="w-4 h-4 text-ui-charcoal" />
          {{ isDropdownOpen ? 'Hide Prize Divisions' : 'Show Prize Divisions' }}
        </span>
        <ChevronUp v-if="isDropdownOpen" class="w-4 h-4" />
        <ChevronDown v-else class="w-4 h-4" />
      </button>

      <!-- Dropdown Content Table -->
      <div
        v-if="isDropdownOpen"
        id="prize-divisions-table"
        class="mt-3 p-3 rounded-[24px] bg-canvas-peach/20 border border-ui-charcoal space-y-2 transition-all"
      >
        <div class="grid grid-cols-4 text-[9px] uppercase font-extrabold tracking-wider text-ui-charcoal/70 px-2 py-1 border-b border-ui-charcoal/20">
          <div>Div</div>
          <div class="text-center">Matches</div>
          <div class="text-center">Winners</div>
          <div class="text-right">Prize</div>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="div in draw.prizeDivisions"
            :key="div.division"
            class="grid grid-cols-4 items-center text-xs px-2 py-2 rounded-[16px] bg-white border border-ui-charcoal"
          >
            <div class="ui-heading text-ui-charcoal">
              {{ div.division.replace('Division ', '') }}
            </div>
            <div class="text-center text-[10px] font-semibold text-ui-charcoal/70">
              {{ div.matches.replace(' Match', '') }}
            </div>
            <div class="text-center text-[10px] font-semibold text-ui-charcoal">
              {{ div.winners.toLocaleString() }}
            </div>
            <div class="text-right ui-heading text-ui-charcoal">
              {{ formatZAR(div.prize.amount) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

