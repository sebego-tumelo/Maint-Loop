import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchResults as fetchResultsApi, fetchPredictions as fetchPredictionsApi } from '../services/api';
import { mapBackendPredictionToFrontend } from '../utils/dataMapper';
import { computeFinancialStats } from '../utils/lottoEngine';

export const useLottoStore = defineStore('lotto', () => {
  // State
  const results = ref([]);
  const predictions = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Actions
  function saveToLocalStorage(preds) {
    localStorage.setItem('lotto_predictions', JSON.stringify(preds));
  }

  function loadFromLocalStorage() {
    const stored = localStorage.getItem('lotto_predictions');
    if (stored) {
      predictions.value = JSON.parse(stored);
    }
  }

  async function fetchResults() {
    loading.value = true;
    try {
      results.value = await fetchResultsApi();
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPredictions() {
    loading.value = true;
    try {
      const data = await fetchPredictionsApi();
      const frontendPreds = data.map(mapBackendPredictionToFrontend);
      
      // Enforce limit: newest are kept, oldest dropped
      const limited = frontendPreds.slice(-20);
      predictions.value = limited;
      saveToLocalStorage(limited);
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  function updatePredictions(newPred) {
    // Add newest, limit to 20
    const updated = [newPred, ...predictions.value].slice(0, 20);
    predictions.value = updated;
    saveToLocalStorage(updated);
  }

  // Getters
  const latestResult = computed(() => {
    console.log('DEBUG: latestResult computed, results length:', results.value.length);
    if (results.value.length === 0) return null;
    const latest = results.value.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    console.log('DEBUG: latestResult:', latest);
    return latest;
  });

  const activePrediction = computed(() => {
    if (predictions.value.length === 0) return null;
    // Find the first prediction that is not 'evaluated',
    // otherwise fallback to the most recent prediction.
    const unevaluated = predictions.value.find(p => p.status !== 'evaluated');
    return unevaluated || predictions.value[0];
  });

  const financialStats = computed(() => {
    return computeFinancialStats(predictions.value, activePrediction.value);
  });

  const latestMatchedNumbers = computed(() => {
    if (activePrediction.value && activePrediction.value.status === 'evaluated') {
      const matched = [];
      activePrediction.value.sets.forEach((set) => {
        if (set.matchedNumbers) {
          set.matchedNumbers.forEach((num) => {
            if (!matched.includes(num)) matched.push(num);
          });
        }
      });
      return matched;
    }
    return [];
  });

  return {
    results,
    predictions,
    loading,
    error,
    fetchResults,
    fetchPredictions,
    updatePredictions,
    loadFromLocalStorage,
    latestResult,
    activePrediction,
    financialStats,
    latestMatchedNumbers
  };
});
