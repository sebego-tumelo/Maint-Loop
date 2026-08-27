// API service to interact with the backend
const API_BASE = '/api';

/**
 * Fetches all results from the backend and maps them to the expected frontend format.
 * API Schema: { success: boolean, count: number, data: Array<DrawResult> }
 * DrawResult: { drawDate: string, winningNumbers: Array<number>, ... }
 */
export async function fetchResults() {
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
    return result.data.map(draw => ({
      ...draw,
      date: draw.drawDate, // Mapping drawDate to date
    }));
  } catch (error) {
    console.error('Error fetching results:', error);
    throw error;
  }
}
