// API service to interact with the backend
import { generateDivisions } from '../utils/lottoEngine';
import { seedResults } from '../data/seedData';
const API_BASE = '/api';

const STORAGE_KEY = 'lotto_results_cache_v2';
const CACHE_EXPIRY_KEY = 'lotto_results_timestamp_v2';

const PRED_STORAGE_KEY = 'lotto_predictions_cache';
const PRED_CACHE_EXPIRY_KEY = 'lotto_predictions_timestamp';
const ANALYSIS_TIMESTAMP_KEY = 'analysis_timestamp';

/**
 * Triggers dataset analysis if the previous analysis is stale.
 */
export async function triggerAnalysisIfStale() {
  const lastAnalysis = localStorage.getItem(ANALYSIS_TIMESTAMP_KEY);
  
  // If no analysis yet, or if it is stale, run it
  if (!lastAnalysis || isStale(lastAnalysis)) {
    try {
      const response = await fetch(`${API_BASE}/analyze-dataset`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Failed to trigger analysis: ${response.status}`);
      }
      localStorage.setItem(ANALYSIS_TIMESTAMP_KEY, new Date().toISOString());
      console.log('✅ Dataset analysis triggered successfully.');
    } catch (e) {
      console.error('❌ Failed to trigger analysis:', e);
    }
  }
}

/**
 * Fetches predictions with caching logic using the latest-predictions endpoint.
 */
export async function fetchPredictions() {
  const cachedData = localStorage.getItem(PRED_STORAGE_KEY);
  const lastFetch = localStorage.getItem(PRED_CACHE_EXPIRY_KEY);

  // If we have data, we assume it's valid for the current day.
  // We only refetch if we have no data or if it's a new day (after 8 PM).
  if (cachedData && lastFetch && !isStale(lastFetch)) {
    return JSON.parse(cachedData);
  }

  const hasCache = !!cachedData;
  let limit = 20;

  if (hasCache) {
    const existing = JSON.parse(cachedData);
    // existing is expected to be sorted newest-first
    const lastCachedDate = new Date(existing[0].draw_date);
    const today = new Date();
    
    // Calculate difference in days (ignoring time)
    const diffTime = today.getTime() - lastCachedDate.getTime();
    const daysMissed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Ensure we fetch at least 1, but no more than 20
    limit = Math.min(Math.max(daysMissed, 1), 20);
  }

  try {
    const response = await fetch(`${API_BASE}/latest-predictions?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Failed to fetch predictions: Invalid API response format');
    }

    const formattedNewData = result.data; // Already in correct format

    let finalData;
    if (hasCache) {
      const existing = JSON.parse(cachedData);
      // Prepend only unique results (by draw_date)
      const existingDates = new Set(existing.map(d => d.draw_date));
      const uniqueNew = formattedNewData.filter(d => !existingDates.has(d.draw_date));
      finalData = [...uniqueNew, ...existing];
    } else {
      finalData = formattedNewData;
    }

    // Cache the data
    localStorage.setItem(PRED_STORAGE_KEY, JSON.stringify(finalData));
    localStorage.setItem(PRED_CACHE_EXPIRY_KEY, new Date().toISOString());

    return finalData;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    // If fetch fails but we have cache, return cache as fallback
    if (cachedData) return JSON.parse(cachedData);
    throw error;
  }
}

/**
 * Fetches results with caching logic using the latest-results endpoint.
 */
export async function fetchResults() {
  const cachedData = localStorage.getItem(STORAGE_KEY);
  const lastFetch = localStorage.getItem(CACHE_EXPIRY_KEY);

  // If we have data, we assume it's valid for the current day.
  // We only refetch if we have no data or if it's a new day (after 8 PM).
  if (cachedData && lastFetch && !isStale(lastFetch)) {
    return JSON.parse(cachedData);
  }

  const hasCache = !!cachedData;
  let limit = 20;

  if (hasCache) {
    const existing = JSON.parse(cachedData);
    // existing is expected to be sorted newest-first
    const lastCachedDate = new Date(existing[0].date);
    const today = new Date();
    
    // Calculate difference in days (ignoring time)
    const diffTime = today.getTime() - lastCachedDate.getTime();
    const daysMissed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Ensure we fetch at least 1, but no more than 20
    limit = Math.min(Math.max(daysMissed, 1), 20);
  }

  try {
    const response = await fetch(`${API_BASE}/latest-results?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Failed to fetch results: Invalid API response format');
    }

    const formattedNewData = result.data.map(draw => {
      const id = draw.drawNumber || draw.id || draw._id || `draw-${draw.date}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        id,
        ...draw,
        // Ensure we have some reasonable defaults if fields are missing in API
        prizePool: draw.prizePool || 0,
        divisions: draw.divisions || generateDivisions(draw.winningNumbers, draw.prizePool || 0),
      };
    });

    let finalData;
    if (formattedNewData.length === 0) {
        console.log('No data from API, using seed data.');
        finalData = seedResults;
    } else if (hasCache) {
      const existing = JSON.parse(cachedData);
      // Prepend only unique results (by date)
      const existingDates = new Set(existing.map(d => d.date));
      const uniqueNew = formattedNewData.filter(d => !existingDates.has(d.date));
      finalData = [...uniqueNew, ...existing];
    } else {
      finalData = formattedNewData;
    }

    // Cache the data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
    localStorage.setItem(CACHE_EXPIRY_KEY, new Date().toISOString());

    return finalData;
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
export function isStale(timestamp) {
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
