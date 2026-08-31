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
      predictions.value = data.map(mapBackendPredictionToFrontend);
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  // Getters
  const latestResult = computed(() => {
    if (results.value.length === 0) return null;
    return results.value.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  });

  const activePrediction = computed(() => {
    if (predictions.value.length === 0) return null;
    // Assuming predictions are already sorted by draw_date, newest first
    return predictions.value[0];
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
    latestResult,
    activePrediction,
    financialStats,
    latestMatchedNumbers
  };
});
