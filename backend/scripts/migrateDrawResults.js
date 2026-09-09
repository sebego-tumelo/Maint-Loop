import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DrawResult } from '../models/DrawResult.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars. The file is in backend/scripts/migrateDrawResults.js,
// so ../.env refers to backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- CONFIGURATION ---
const SOURCE_DB = 'daily-lotto-scraper-api'; // Replace with DB A name
const GAME_ID = 11001; 
const START_ISSUE = 2730;
// ----------------------

const SourceDrawResultSchema = new mongoose.Schema({}, { strict: false });

async function migrate() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to cluster.');

    const sourceDb = mongoose.connection.useDb(SOURCE_DB);
    // Assumes collection name in DB A is 'drawresults'
    const SourceModel = sourceDb.model('drawresults', SourceDrawResultSchema, 'drawresults');

    // 1. Fetch and Sort (newest first)
    const records = await SourceModel.find({}).lean();
    records.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));
    
    console.log(`Found ${records.length} records to migrate.`);

    let currentIssue = START_ISSUE;
    let processedCount = 0;

    // 2. Transform and Upsert
    for (const doc of records) {
      processedCount++;
      const drawTime = new Date(doc.drawDate);
      
      // Construct a range query for the same day to be robust against time discrepancies
      const startOfDay = new Date(drawTime);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(drawTime);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Check if this record already exists in the target DB to avoid re-issuing
      const existing = await DrawResult.findOne({ 
        gameId: GAME_ID, 
        drawTime: { $gte: startOfDay, $lte: endOfDay } 
      });
      
      if (existing) {
        console.log(`Skipping record for ${doc.drawDate} (already exists)`);
        continue;
      }

      const transformed = {
        gameId: GAME_ID,
        issue: currentIssue,
        drawTime: drawTime,
        isLatestIssue: false, // We assume 2732 is the latest
        winNums: (doc.winningNumbers || []).map((num, i) => ({
          winNum: String(num),
          winNumFlag: 0,
          numSn: String(i + 1),
          drawSeq: '1'
        })),
        winLevels: doc.prizeDivisions ? doc.prizeDivisions.map((div, i) => ({
          winLevelName: div.division,
          winCount: div.winners,
          winAmount: div.prize?.amount || 0,
          matches: div.matches,
          winLevelId: i + 1
        })) : [],
        winPoolInfo: {
            winPoolName: 'DAILY LOTTO',
            nextDrawTime: drawTime // placeholder
        },
        rawResponse: doc
      };

      // 3. Upsert to Target
      await DrawResult.updateOne(
        { 
          gameId: GAME_ID, 
          drawTime: { $gte: startOfDay, $lte: endOfDay } 
        },
        { $set: transformed },
        { upsert: true }
      );
      
      process.stdout.write(`\rMigrated count: ${processedCount}`);
      
      currentIssue--; // Move to next issue
    }

    console.log('\nMigration completed successfully.');
    process.exit();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
