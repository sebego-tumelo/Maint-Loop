import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

import { DrawResult } from '../../models/DrawResult.js';
import { LottoMetadata } from '../../models/LottoMetadata.js';
import { syncAndGetStats } from '../../utils.js';

export const DataGateway = {
  getHistoricalDraws: async () => {
    try {
      // 1. Connection Management
      if (mongoose.connection.readyState !== 1) {
        if (!process.env.MONGODB_URI) {
          throw new Error("MONGODB_URI is not defined in backend/.env");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DataGateway: Connected to MongoDB.");
      }

      // 2. Data Retrieval
      const { rawDrawHistory } = await syncAndGetStats({ DrawResult, LottoMetadata });

      // 3. Data Normalization (Critical: Sort Oldest to Newest)
      // syncAndGetStats likely returns sorted by issue descending (newest first).
      const sortedHistory = rawDrawHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

      return sortedHistory;
    } catch (error) {
      // 4. Error Handling
      console.error("DataGateway Error in getHistoricalDraws:", error);
      throw error; // Re-throw to ensure simulation doesn't continue with empty data
    }
  }
};
