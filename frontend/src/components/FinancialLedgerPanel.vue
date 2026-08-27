<script setup>
import { computed } from 'vue';
import { Info, Sparkles, TrendingUp, TrendingDown, Coins } from 'lucide-vue-next';
import { formatZAR, formatSignedZAR } from '../utils/lottoEngine';

const props = defineProps({
  stats: {
    type: Object,
    required: true,
  },
  onOpenPrizeInfoModal: {
    type: Function,
    required: true,
  },
});

const isProfitable = computed(() => props.stats.netProfit >= 0);
</script>

<template>
  <section
    id="section-financial-ledger"
    class="w-full bg-white rounded-[24px] p-4 border border-ui-charcoal space-y-4 transition-all"
  >
    <!-- Panel Title -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-[16px] bg-metric-orange border border-ui-charcoal flex items-center justify-center text-ui-charcoal">
          <Coins class="w-4 h-4" />
        </div>
        <div>
          <h2 class="ui-heading text-xs tracking-wider text-ui-charcoal">
            FINANCIAL LEDGER
          </h2>
          <p class="ui-body text-[10px] text-ui-charcoal/70">
            Investment performance
          </p>
        </div>
      </div>
    </div>

    <!-- 4-Quadrant Pastel Grid (Direct 1:1 match to the reference image) -->
    <div class="grid grid-cols-2 gap-2.5">
      <!-- 1. Top Left -->
      <div
        id="metric-current-cost"
        class="p-4 rounded-[24px] bg-metric-salmon border border-ui-charcoal text-ui-charcoal flex items-center justify-between"
      >
        <div class="min-w-0 pr-1">
          <div class="ui-heading text-xl tracking-tight leading-none text-ui-charcoal">
            {{ formatZAR(stats.currentDrawCost) }}
          </div>
          <div class="ui-body text-[11px] text-ui-charcoal/80 mt-1 leading-tight">
            Draw Stake
          </div>
        </div>

        <!-- Metric Ring -->
        <div class="w-10 h-10 shrink-0 relative flex items-center justify-center">
          <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="white" stroke-width="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#A6334D" stroke-width="3.5" stroke-dasharray="35 60" stroke-linecap="round" />
          </svg>
          <span class="absolute text-[8px] font-black text-ui-charcoal">R9</span>
        </div>
      </div>

      <!-- 2. Top Right -->
      <div
        id="metric-lifetime-spent"
        class="p-4 rounded-[24px] bg-metric-mint border border-ui-charcoal text-ui-charcoal flex items-center justify-between"
      >
        <div class="min-w-0 pr-1">
          <div class="ui-heading text-xl tracking-tight leading-none text-ui-charcoal">
            {{ formatZAR(stats.lifetimeSpent) }}
          </div>
          <div class="ui-body text-[11px] text-ui-charcoal/80 mt-1 leading-tight">
            Total Invested
          </div>
        </div>

        <!-- Metric Ring -->
        <div class="w-10 h-10 shrink-0 relative flex items-center justify-center">
          <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="white" stroke-width="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#256B52" stroke-width="3.5" stroke-dasharray="55 40" stroke-linecap="round" />
          </svg>
          <span class="absolute text-[8px] font-black text-ui-charcoal">{{ stats.totalDrawsEvaluated }}d</span>
        </div>
      </div>

      <!-- 3. Bottom Left -->
      <div
        id="metric-lifetime-won"
        class="p-4 rounded-[24px] bg-metric-lavender border border-ui-charcoal text-ui-charcoal flex items-center justify-between"
      >
        <div class="min-w-0 pr-1">
          <div class="ui-heading text-xl tracking-tight leading-none text-ui-charcoal">
            {{ formatZAR(stats.lifetimeWon) }}
          </div>
          <div class="ui-body text-[11px] text-ui-charcoal/80 mt-1 leading-tight">
            Lifetime Won
          </div>
        </div>

        <!-- Metric Ring -->
        <div class="w-10 h-10 shrink-0 relative flex items-center justify-center">
          <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="white" stroke-width="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#52479B" stroke-width="3.5" stroke-dasharray="68 30" stroke-linecap="round" />
          </svg>
          <span class="absolute text-[8px] font-black text-ui-charcoal">★</span>
        </div>
      </div>

      <!-- 4. Bottom Right -->
      <div
        id="metric-net-profit-roi"
        class="p-4 rounded-[24px] bg-metric-orange border border-ui-charcoal text-ui-charcoal flex items-center justify-between"
      >
        <div class="min-w-0 pr-1">
          <div class="ui-heading text-xl tracking-tight leading-none text-ui-charcoal flex items-baseline gap-1">
            <span>{{ isProfitable ? `+${stats.roiPercentage.toFixed(0)}%` : `${stats.roiPercentage.toFixed(0)}%` }}</span>
          </div>
          <div class="ui-body text-[11px] text-ui-charcoal/80 mt-1 leading-tight truncate">
            Net Yield / ROI
          </div>
        </div>

        <!-- Metric Ring -->
        <div class="w-10 h-10 shrink-0 relative flex items-center justify-center">
          <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="white" stroke-width="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#A6334D" stroke-width="3.5" stroke-dasharray="60 35" stroke-linecap="round" />
          </svg>
          <TrendingUp v-if="isProfitable" class="absolute w-4 h-4 text-ui-charcoal" />
          <TrendingDown v-else class="absolute w-4 h-4 text-ui-charcoal" />
        </div>
      </div>
    </div>

    <!-- Category Filter Chips (Matches the 3 pills below cards in the reference image: Meowing, Licking, Scratching) -->
    
  </section>
</template>

