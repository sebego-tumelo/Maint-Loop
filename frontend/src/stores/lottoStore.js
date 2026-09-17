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
  function saveToLocalStorage() {
    localStorage.setItem('lotto_predictions', JSON.stringify(predictions.value));
    localStorage.setItem('lotto_results', JSON.stringify(results.value));
  }

  function loadFromLocalStorage() {
    const storedPreds = localStorage.getItem('lotto_predictions');
    if (storedPreds) {
      predictions.value = JSON.parse(storedPreds);
    }
    const storedResults = localStorage.getItem('lotto_results');
    if (storedResults) {
      results.value = JSON.parse(storedResults);
    }
  }

  async function fetchResults() {
    loading.value = true;
    try {
      const data = await fetchResultsApi();
      // Enforce limit: newest are kept, oldest dropped
      const limited = data.slice(-20);
      results.value = limited;
      saveToLocalStorage();
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  function updateResults(newResults) {
    // Assuming newResults might be one or more.
    // If it's a list, merge and limit to 20.
    const merged = [...newResults, ...results.value].sort((a,b) => new Date(b.date) - new Date(a.date));
    const limited = merged.slice(0, 20);
    results.value = limited;
    saveToLocalStorage();
  }

  async function fetchPredictions() {
    loading.value = true;
    try {
      const data = await fetchPredictionsApi();
      const frontendPreds = data.map(mapBackendPredictionToFrontend);
      
      // Enforce limit: newest are kept, oldest dropped
      const limited = frontendPreds.slice(-20);
      predictions.value = limited;
      saveToLocalStorage();
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
    saveToLocalStorage();
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
    updateResults,
    updatePredictions,
    loadFromLocalStorage,
    latestResult,
    activePrediction,
    financialStats,
    latestMatchedNumbers
  };
});
