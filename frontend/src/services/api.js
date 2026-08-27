// API service to interact with the backend
const API_BASE = '/api';
const STORAGE_KEY = 'lotto_results_cache';
const CACHE_EXPIRY_KEY = 'lotto_results_timestamp';

/**
 * Fetches all results from the backend and maps them to the expected frontend format.
 * API Schema: { success: boolean, count: number, data: Array<DrawResult> }
 * DrawResult: { drawDate: string, winningNumbers: Array<number>, ... }
 */
export async function fetchResults() {
  const cachedData = localStorage.getItem(STORAGE_KEY);
  const lastFetch = localStorage.getItem(CACHE_EXPIRY_KEY);

  // If we have data, we assume it's valid for the current day.
  // We only refetch if we have no data or if it's a new day (after 8 PM).
  if (cachedData && lastFetch && !isStale(lastFetch)) {
    return JSON.parse(cachedData);
  }

  try {
    const response = await fetch(`${API_BASE}/results`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Failed to fetch results: Invalid API response format');
    }

    // Map API DrawResult to frontend-expected format
    const formattedData = result.data.map(draw => ({
      ...draw,
      date: draw.drawDate, // Mapping drawDate to date
    }));

    // Cache the data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedData));
    localStorage.setItem(CACHE_EXPIRY_KEY, new Date().toISOString());

    return formattedData;
  } catch (error) {
    console.error('Error fetching results:', error);
    // If fetch fails but we have cache, return cache as fallback
    if (cachedData) return JSON.parse(cachedData);
    throw error;
  }
}

/**
 * Checks if the cached data is stale (i.e., today is a new day after 8 PM).
 */
function isStale(timestamp) {
  const lastFetchDate = new Date(timestamp);
  const now = new Date();
  
  // If last fetch was a different day, it's stale
  if (lastFetchDate.toDateString() !== now.toDateString()) {
    return true;
  }
  
  // If last fetch was today but before 8 PM, and now it's after 8 PM, it's stale
  if (lastFetchDate.getHours() < 20 && now.getHours() >= 20) {
    return true;
  }
  
  return false;
}
