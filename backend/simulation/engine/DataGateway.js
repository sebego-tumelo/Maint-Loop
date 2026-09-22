import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load configuration from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

import { DrawResult } from '../../models/DrawResult.js';
import { LottoMetadata } from '../../models/LottoMetadata.js';
import { syncAndGetStats } from '../../utils.js';

async function fetchFromSecondaryDB() {
  const secondaryUri = process.env.MONGODB_URI.replace('future-live', 'daily-lotto-scraper-api');
  // Use createConnection, and wait for it to be ready
  const conn = mongoose.createConnection(secondaryUri);
  await conn.asPromise(); 

  const collection = conn.collection('drawresults');
  // Use toArray() on the cursor, which find() returns
  const docs = await collection.find({}).toArray(); 
  
  console.log("DataGateway: Fetched " + docs.length + " docs from secondary DB");
  
  return docs.map(doc => ({
    id: doc._id,
    drawNumber: doc.drawNumber,
    date: doc.drawDate,
    winningNumbers: doc.winningNumbers,
    prizePool: 0,
    prizeDivisions: []
  }));
}

export const DataGateway = {
  getHistoricalDraws: async () => {
    try {
      // 1. Connection Management
      if (mongoose.connection.readyState !== 1) {
        if (!process.env.MONGODB_URI) {
          throw new Error("MONGODB_URI is not defined in backend/.env");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DataGateway: Connected to primary MongoDB.");
      }

      // 2. Data Retrieval
      let { rawDrawHistory } = await syncAndGetStats({ DrawResult, LottoMetadata });

      // If missing data, try to supplement from secondary
      if (rawDrawHistory.length < 500) { // Example threshold
        const secondaryUri = process.env.MONGODB_URI.replace('future-live', 'daily-lotto-scraper-api');
        console.log("DataGateway: Insufficient data found, attempting to fetch from secondary DB: " + secondaryUri);
        try {
          const secondaryData = await fetchFromSecondaryDB();
          // Merge or supplement rawDrawHistory here
          rawDrawHistory = [...rawDrawHistory, ...secondaryData];
        } catch (secondaryErr) {
          console.warn("DataGateway: Failed to fetch from secondary DB:", secondaryErr.message);
        }
      }

      // 3. Data Normalization (Critical: Sort Oldest to Newest)
      const sortedHistory = rawDrawHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

      return sortedHistory;
    } catch (error) {
      // 4. Error Handling
      console.error("DataGateway Error in getHistoricalDraws:", error);
      throw error; // Re-throw to ensure simulation doesn't continue with empty data
    }
  }
};
