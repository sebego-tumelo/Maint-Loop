<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useLottoStore } from './stores/lottoStore';
import { Trophy, Zap, Coins, History, Home, Sparkles, MapPin, Loader2 } from 'lucide-vue-next';
import Header from './components/Header.vue';
import LatestDrawPanel from './components/LatestDrawPanel.vue';
import CurrentPredictionPanel from './components/CurrentPredictionPanel.vue';
import FinancialLedgerPanel from './components/FinancialLedgerPanel.vue';
import HistoricalRecordsPanel from './components/HistoricalRecordsPanel.vue';
import PredictModal from './components/PredictModal.vue';
import SimulateDrawModal from './components/SimulateDrawModal.vue';
import PrizeInfoModal from './components/PrizeInfoModal.vue';

import { computeFinancialStats } from './utils/lottoEngine';
import { mapBackendPredictionToFrontend } from './utils/dataMapper';
import { isStale, ensureAnalysisComplete } from './services/api';

// Reactive state
const store = useLottoStore();
const { results: draws, loading: isLoading, error, predictions, activePrediction: currentActivePrediction } = storeToRefs(store);
const isUpdating = ref(false);
const isAnalyzing = ref(false);

// Modal visibility state
const isPredictModalOpen = ref(false);
const isSimulateModalOpen = ref(false);
const isPrizeInfoModalOpen = ref(false);

// Active section for bottom nav
const activeSection = ref('home');

// Computed values
const latestDraw = computed(() => {
  return draws.value[0] || {};
});

// Removed historicalPredictions computed - will update components to use store.predictions directly
// Removed financialStats computed - will update components to use store.financialStats directly
// Removed latestMatchedNumbers computed - will update components to use store.latestMatchedNumbers directly

// Fetch data on mount
onMounted(async () => {
  try {
    isLoading.value = true;
    
    // 1. Ensure Analysis is up-to-date
    isAnalyzing.value = true;
    await ensureAnalysisComplete();
    isAnalyzing.value = false;

    // 2. Fetch App Data
    await Promise.all([
      store.fetchResults(),
      store.fetchPredictions(),
    ]);
  } catch (err) {
    error.value = 'Failed to load data.';
    console.error(err);
  } finally {
    isLoading.value = false;
    isAnalyzing.value = false;
  }
});

// Event Handlers
const handleSavePrediction = (newPredictionData) => {
  // Now simply update the active prediction with the merged result from the backend
  currentActivePrediction.value = mapBackendPredictionToFrontend(newPredictionData);
  
  // Update predictions list, replace or prepend
  const index = predictions.value.findIndex(p => p.id === newPredictionData._id);
  if (index !== -1) {
    predictions.value[index] = currentActivePrediction.value;
  } else {
    predictions.value = [currentActivePrediction.value, ...predictions.value];
  }
};

const handleSimulateAndApplyDraw = (newDraw, evaluatedPrediction) => {
  // Prepend new official draw
  draws.value = [newDraw, ...draws.value];

  // If we had an active prediction evaluated with this draw
  if (evaluatedPrediction) {
    currentActivePrediction.value = evaluatedPrediction;
    predictions.value = predictions.value.map((p) =>
      p.id === evaluatedPrediction.id ? evaluatedPrediction : p
    );
  }
};

const scrollToSection = (id, sectionName) => {
  activeSection.value = sectionName;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>

<template>
  <div class="min-h-screen text-ui-charcoal font-sans flex flex-col items-center selection:bg-metric-orange selection:text-ui-charcoal pb-16">
    <!-- Main Container Formatted to Mobile Frame Width -->
    <div class="relative z-10 w-full max-w-md mx-auto flex flex-col min-h-screen">
      <!-- App Header -->
      <Header
        v-if="!isLoading && latestDraw"
        :isUpdating="isUpdating"
        :onOpenPredictModal="() => (isPredictModalOpen = true)"
        :onOpenSimulateModal="() => (isSimulateModalOpen = true)"
        :onOpenPrizeInfoModal="() => (isPrizeInfoModalOpen = true)"
      />
      <div v-else-if="isLoading" class="p-4 text-center">
        <Loader2 class="animate-spin inline-block w-6 h-6" />
        <p>{{ isAnalyzing ? 'Running background analysis...' : 'Loading results...' }}</p>
      </div>
      <div v-else class="p-4 text-center text-red-500">{{ error }}</div>

      <!-- Main Body Flowing Content -->
      <main class="flex-1 px-4 py-4 space-y-4">

          <!-- 2. Current Prediction Card with Goal progress bar & Tripartite sliders -->
        <CurrentPredictionPanel
          :latestWinningNumbers="latestDraw.winningNumbers"
          :onOpenPredictModal="() => (isPredictModalOpen = true)"
        />
        
        <!-- 1. Financial Ledger 4-Quadrant Pastel Grid (Needs Satisfaction, Activity, Sleep, Wellness from image) -->
        <FinancialLedgerPanel />

      

        <!-- 3. Latest Official Draw Results Banner -->
        <!-- <LatestDrawPanel
          :draw="latestDraw"
          :matchedNumbers="latestMatchedNumbers"
        /> -->

        <!-- 4. Historical Records & Prediction Performance Log -->
        <HistoricalRecordsPanel />
      </main>

      <!-- Floating Bottom Navigation Pill Bar -->
      <div class="fixed bottom-4 left-0 right-0 z-40 px-6 pointer-events-none">
        <nav
          id="mobile-bottom-nav"
          class="max-w-xs sm:max-w-sm mx-auto bg-nav-sand text-ui-charcoal rounded-[24px] py-2.5 px-5 border border-ui-charcoal flex items-center justify-between pointer-events-auto transition-transform duration-200 hover:scale-[1.02]"
        >
          <!-- 1. Home / Results -->
          <button
            id="nav-btn-home"
            @click="scrollToSection('section-home', 'home')"
            title="Home"
            :class="[
              'p-2 rounded-full transition-all cursor-pointer',
              activeSection === 'home' ? 'bg-ui-charcoal text-white' : 'text-ui-charcoal hover:bg-ui-charcoal/10'
            ]"
          >
            <Home class="w-4 h-4" />
          </button>

          <!-- 2. Prediction -->
          <button
            id="nav-btn-predict-scroll"
            @click="scrollToSection('section-current-prediction', 'prediction')"
            title="Prediction"
            :class="[
              'p-2 rounded-full transition-all cursor-pointer',
              activeSection === 'prediction' ? 'bg-ui-charcoal text-white' : 'text-ui-charcoal hover:bg-ui-charcoal/10'
            ]"
          >
            <Zap class="w-4 h-4" />
          </button>

          <!-- 3. Ledger -->
          <button
            id="nav-btn-ledger"
            @click="scrollToSection('section-financial-ledger', 'ledger')"
            title="Financial Ledger"
            :class="[
              'p-2 rounded-full transition-all cursor-pointer',
              activeSection === 'ledger' ? 'bg-ui-charcoal text-white' : 'text-ui-charcoal hover:bg-ui-charcoal/10'
            ]"
          >
            <Coins class="w-4 h-4" />
          </button>

          <!-- 4. History -->
          <button
            id="nav-btn-history"
            @click="scrollToSection('section-historical-records', 'history')"
            title="History Log"
            :class="[
              'p-2 rounded-full transition-all cursor-pointer',
              activeSection === 'history' ? 'bg-ui-charcoal text-white' : 'text-ui-charcoal hover:bg-ui-charcoal/10'
            ]"
          >
            <History class="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>

    <!-- Modals -->
    <PredictModal
      :isOpen="isPredictModalOpen"
      :targetDrawDate="currentActivePrediction?.targetDrawDate || latestDraw.date"
      :onClose="() => (isPredictModalOpen = false)"
      :onSavePrediction="handleSavePrediction"
    />

    <SimulateDrawModal
      :isOpen="isSimulateModalOpen"
      :currentPrediction="currentActivePrediction"
      :onClose="() => (isSimulateModalOpen = false)"
      :onSimulateAndApplyDraw="handleSimulateAndApplyDraw"
    />

    <PrizeInfoModal
      :isOpen="isPrizeInfoModalOpen"
      :onClose="() => (isPrizeInfoModalOpen = false)"
    />
  </div>
</template>

