<script setup>
import { ShieldCheck, X, Coins, Trophy, ExternalLink } from 'lucide-vue-next';

defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  onClose: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <div
    v-if="isOpen"
    id="modal-prize-info"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
  >
    <div
      id="modal-prize-container"
      class="w-full max-w-md bg-white border border-ui-charcoal rounded-[24px] shadow-xl p-5 relative overflow-hidden max-h-[90vh] overflow-y-auto text-ui-charcoal"
    >
      <div class="flex items-center justify-between pb-3 border-b border-ui-charcoal/20 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-[16px] bg-metric-mint border border-ui-charcoal flex items-center justify-center text-ui-charcoal">
            <ShieldCheck class="w-4 h-4" />
          </div>
          <div>
            <h3 class="ui-heading text-xs tracking-wider text-ui-charcoal">
              DAILY LOTTO RULES & PAYOUTS
            </h3>
            <p class="ui-body text-[10px] text-ui-charcoal/70">
              Official South African National Lottery Framework
            </p>
          </div>
        </div>

        <button
          id="btn-close-prize-modal"
          @click="onClose"
          class="p-1 rounded-full text-ui-charcoal/70 hover:text-ui-charcoal hover:bg-canvas-peach transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-4 text-xs text-ui-charcoal">
        <!-- Game Structure -->
        <div class="p-4 rounded-[24px] bg-canvas-peach/30 border border-ui-charcoal space-y-2">
          <div class="ui-heading text-ui-charcoal flex items-center gap-2 text-xs">
            <Trophy class="w-4 h-4" />
            <span>Game Matrix: 5 / 36</span>
          </div>
          <p class="ui-body text-[11px] text-ui-charcoal/80">
            Players select 5 numbers between 1 and 36. Daily draws occur every evening at
            <strong class="font-black">21:00 SAST</strong>.
          </p>
        </div>

        <!-- Cost Rules -->
        <div class="p-4 rounded-[24px] bg-canvas-peach/30 border border-ui-charcoal space-y-2">
          <div class="ui-heading text-ui-charcoal flex items-center gap-2 text-xs">
            <Coins class="w-4 h-4" />
            <span>Ticket Cost & Strategy</span>
          </div>
          <p class="ui-body text-[11px] text-ui-charcoal/80">
            Each board costs <strong class="font-black">R3.00</strong>.
            Standard sessions play <strong class="font-black">3 boards (R9.00 total)</strong> for optimal coverage.
          </p>
        </div>

        <!-- Divisions Breakdown -->
        <div class="p-4 rounded-[24px] bg-canvas-peach/20 border border-ui-charcoal space-y-3">
          <div class="ui-heading text-ui-charcoal text-xs">Official Prize Divisions</div>
          <div class="space-y-2 text-[11px]">
            <div class="flex justify-between py-1 border-b border-ui-charcoal/20">
              <span class="ui-body">Match 5 (Jackpot)</span>
              <span class="ui-heading text-ui-charcoal">35.6%</span>
            </div>
            <div class="flex justify-between py-1 border-b border-ui-charcoal/20">
              <span class="ui-body">Match 4</span>
              <span class="ui-heading text-ui-charcoal">33.7%</span>
            </div>
            <div class="flex justify-between py-1 border-b border-ui-charcoal/20">
              <span class="ui-body">Match 3</span>
              <span class="ui-heading text-ui-charcoal">21.4%</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="ui-body">Match 2</span>
              <span class="ui-heading text-ui-charcoal">9.3%</span>
            </div>
          </div>
        </div>

        <!-- Rolldown -->
        <div class="p-4 rounded-[24px] bg-nav-sand border border-ui-charcoal text-ui-charcoal text-[11px] ui-body space-y-1">
          <div class="ui-heading flex items-center gap-2">
            <ExternalLink class="w-3.5 h-3.5" />
            <span>Jackpot Rolldown Rule</span>
          </div>
          <p>
            If no Match 5, the jackpot rolls down automatically to Match 4 (Division 2), boosting medium-tier payouts!
          </p>
        </div>

        <button
          id="btn-confirm-prize-info"
          @click="onClose"
          class="w-full py-3 rounded-[24px] bg-ui-charcoal text-white ui-heading text-xs uppercase tracking-wider transition-all border border-ui-charcoal"
        >
          Close & Return
        </button>
      </div>
    </div>
  </div>
</template>

