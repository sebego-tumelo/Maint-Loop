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
 * Polls the backend until analysis is complete.
 */
export async function ensureAnalysisComplete() {
  try {
    // 1. Check status
    let response = await fetch(`${API_BASE}/analysis-status`);
    if (!response.ok) throw new Error(`Status check failed: ${response.status}`);
    let { needsAnalysis } = await response.json();

    if (!needsAnalysis) {
      console.log('ℹ️ Dataset analysis is already up to date.');
      return;
    }

    // 2. Trigger analysis
    console.log('🚀 Triggering dataset analysis...');
    const triggerResponse = await fetch(`${API_BASE}/analyze-dataset`, { method: 'POST' });
    if (!triggerResponse.ok) throw new Error(`Trigger failed: ${triggerResponse.status}`);

    // 3. Poll until complete
    console.log('⏳ Analysis initiated, polling for completion...');
    while (true) {
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      response = await fetch(`${API_BASE}/analysis-status`);
      if (!response.ok) throw new Error(`Polling status check failed: ${response.status}`);
      
      const status = await response.json();
      if (!status.needsAnalysis) {
        console.log('✅ Dataset analysis completed.');
        localStorage.setItem(ANALYSIS_TIMESTAMP_KEY, new Date().toISOString());
        break;
      }
      console.log('...still analyzing...');
    }
  } catch (e) {
    console.error('❌ Failed to ensure analysis completion:', e);
    throw e; // Propagate error to trigger UI error state
  }
}

/**
 * Fetches predictions with caching logic using the latest-predictions endpoint.
 */
export async function fetchPredictions() {
  const cachedData = localStorage.getItem(PRED_STORAGE_KEY);
  const lastFetch = localStorage.getItem(PRED_CACHE_EXPIRY_KEY);

  // If we have data, we assume it's valid for the current day.
  // We only refetch if we have no data, if it's a new day, or if the latest data is not from today.
  let isDataCurrent = false;
  if (cachedData) {
    const cachedRecords = JSON.parse(cachedData);
    if (cachedRecords.length > 0) {
      const latestRecordDate = new Date(cachedRecords[0].draw_date);
      if (!isNaN(latestRecordDate.getTime())) {
        const today = new Date();
        isDataCurrent = latestRecordDate.toDateString() === today.toDateString();
      }
    }
  }

  // Refetch if stale OR if data is not current for today
  if (cachedData && lastFetch && !isStale(lastFetch) && isDataCurrent) {
    return JSON.parse(cachedData);
  }
  
  if (!cachedData) {
    console.log('ℹ️ No cached predictions found, fetching fresh data.');
  } else if (isStale(lastFetch)) {
    console.log('⚠️ Cached predictions are stale (by time), fetching fresh data.');
  } else if (!isDataCurrent) {
    console.log('⚠️ Cached predictions are outdated (by date), fetching fresh data.');
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
      
      // Create a map to handle merging, prioritizing new data
      const dataMap = new Map();
      
      // 1. Add existing data first
      existing.forEach(d => dataMap.set(d.draw_date, d));
      
      // 2. Add new data (this will overwrite existing if draw_date matches)
      formattedNewData.forEach(d => dataMap.set(d.draw_date, d));
      
      // 3. Convert back to array and sort by draw_date descending
      finalData = Array.from(dataMap.values()).sort((a, b) => 
        new Date(b.draw_date) - new Date(a.draw_date)
      );
    } else {
      finalData = formattedNewData;
    }

    // Cache the data
    localStorage.setItem(PRED_STORAGE_KEY, JSON.stringify(finalData));
    localStorage.setItem(PRED_CACHE_EXPIRY_KEY, new Date().toISOString());

    return finalData;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    // If fetch fails, clear stale cache to force fresh fetch next time
    localStorage.removeItem(PRED_STORAGE_KEY);
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
  // We only refetch if we have no data, if it's a new day, or if the latest data is not from today.
  let isDataCurrent = false;
  if (cachedData) {
    const cachedRecords = JSON.parse(cachedData);
    if (cachedRecords.length > 0) {
      // Robustly get the date, handling potential variations in key names
      const record = cachedRecords[0];
      const dateValue = record.date || record.drawDate; 
      
      const latestRecordDate = new Date(dateValue);
      
      if (!isNaN(latestRecordDate.getTime())) { // Check for Invalid Date
        const today = new Date();
        // If the latest record date is today, it's current.
        isDataCurrent = latestRecordDate.toDateString() === today.toDateString();
      }
    }
  }

  if (cachedData && lastFetch && !isStale(lastFetch) && isDataCurrent) {
    return JSON.parse(cachedData);
  }

  if (!cachedData) {
    console.log('ℹ️ No cached results found, fetching fresh data.');
  } else if (isStale(lastFetch)) {
    console.log('⚠️ Cached results are stale (by time), fetching fresh data.');
  } else if (!isDataCurrent) {
    console.log('⚠️ Cached results are outdated (by date), fetching fresh data.');
  }

  const hasCache = !!cachedData;
  let limit = 20;

  if (hasCache) {
    const existing = JSON.parse(cachedData);
    // existing is expected to be sorted newest-first
    // Robustly get the date here too
    const lastCachedDate = new Date(existing[0].date || existing[0].drawDate);
    const today = new Date();
    
    // Check if the date is valid before doing math
    if (!isNaN(lastCachedDate.getTime())) {
        const diffTime = today.getTime() - lastCachedDate.getTime();
        const daysMissed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        // Ensure we fetch at least 1, but no more than 20
        limit = Math.min(Math.max(daysMissed, 1), 20);
    } else {
        console.warn('⚠️ Could not parse latest cached date, defaulting to limit 20.');
    }
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
      
      // Create a map to handle merging, prioritizing new data
      const dataMap = new Map();
      
      // 1. Add existing data first
      existing.forEach(d => dataMap.set(d.date, d));
      
      // 2. Add new data (this will overwrite existing if date matches)
      formattedNewData.forEach(d => dataMap.set(d.date, d));
      
      // 3. Convert back to array and sort by date descending
      finalData = Array.from(dataMap.values()).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
    } else {
      finalData = formattedNewData;
    }

    // Cache the data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
    localStorage.setItem(CACHE_EXPIRY_KEY, new Date().toISOString());

    return finalData;
  } catch (error) {
    console.error('Error fetching results:', error);
    // If fetch fails, clear stale cache to force fresh fetch next time
    localStorage.removeItem(STORAGE_KEY);
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
