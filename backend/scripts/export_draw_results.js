import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { DrawResult } from '../models/DrawResult.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const SOURCE_DB_NAME = 'daily-lotto-scraper-api';

async function exportResults() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Fetch from Target DB
  const dbResults = await DrawResult.find().lean();

  // 2. Fetch from Source DB
  const sourceDb = mongoose.connection.useDb(SOURCE_DB_NAME);
  const SourceModel = sourceDb.model('drawresults', new mongoose.Schema({}, { strict: false }), 'drawresults');
  const scraperResults = await SourceModel.find().lean();

  // Transform scraper results to match our schema structure for consistency
  const transformedScraper = scraperResults.map(doc => {
    // Assuming the scraper doc has drawDate, winningNumbers
    const drawTime = new Date(doc.drawDate);
    return {
      drawTime: drawTime,
      winNums: (doc.winningNumbers || []).map((num, i) => ({
        winNum: String(num),
        numSn: String(i + 1),
      })),
    };
  });

  // Merge and deduplicate
  const allResults = [...dbResults, ...transformedScraper];
  const uniqueResults = new Map();

  for (const res of allResults) {
    if (!res.drawTime) continue; // Skip if invalid
    const dateStr = res.drawTime.toISOString().split('T')[0];
    if (!uniqueResults.has(dateStr)) {
        uniqueResults.set(dateStr, res);
    }
  }

  const groupedByYear = {};

  for (const res of uniqueResults.values()) {
    const year = res.drawTime.getFullYear();
    if (!groupedByYear[year]) {
      groupedByYear[year] = [];
    }
    
    // Sort numbers by numSn (string)
    const sortedNums = res.winNums.sort((a, b) => parseInt(a.numSn) - parseInt(b.numSn)).map(n => n.winNum.padStart(2, '0'));
    
    const dateStr = res.drawTime.toISOString().split('T')[0];
    
    groupedByYear[year].push(`${dateStr}    ${sortedNums.join('    ')}`);
  }

  // Create data directory
  const dataDir = path.join(path.dirname(__dirname), 'data');
  try {
      await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
      if (err.code !== 'EEXIST') throw err;
  }

  for (const [year, lines] of Object.entries(groupedByYear)) {
    const filePath = path.join(dataDir, `daily_lotto-past-draws-archive ${year}.txt`);
    const content = `Date    SERIES\n` + lines.join('\n');
    await fs.writeFile(filePath, content);
    console.log(`Exported ${year} to ${filePath}`);
  }

  await mongoose.disconnect();
  console.log('Export completed');
}

exportResults().catch(console.error);
