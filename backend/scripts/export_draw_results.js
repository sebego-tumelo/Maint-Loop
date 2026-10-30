import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { DrawResult } from '../models/DrawResult.js';

dotenv.config();

async function exportResults() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const results = await DrawResult.find().sort({ drawTime: -1 }).lean();

  const groupedByYear = {};

  for (const res of results) {
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
  const dataDir = path.join(process.cwd(), 'data');
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
