import { LottoMetadata } from './models/LottoMetadata.js';
import { syncAndGetStats } from './utils.js';

export async function runAnalysis() {
  console.log('Starting background analysis...');
  try {
    // 1. Fetch and process data
    const stats = await syncAndGetStats();
    
    // 2. Prepare data for MongoDB
    const updateData = {
      lastUpdated: new Date(),
      totalRecords: stats.totalRecords,
      latestResult: stats.latestResult
    };

    // 3. Save to MongoDB
    // Assuming we want to update the existing document or create one if none exists
    await LottoMetadata.findOneAndUpdate(
      {}, // Find any document (assuming only one metadata record for now)
      updateData,
      { upsert: true, new: true }
    );
    
    console.log('Analysis completed and data saved to MongoDB.');
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}
