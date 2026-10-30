import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { DrawResult } from '../models/DrawResult.js';
import { exportResults } from './export_draw_results.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function ingestAndExport() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Load input data
  const inputRaw = await fs.readFile(path.join(__dirname, 'input.json'), 'utf-8');
  const input = JSON.parse(inputRaw);
  const data = input.data;

  // Map JSON to DrawResult schema
  const doc = {
    gameId: data.winNotice.gameId,
    issue: data.winNotice.issue,
    drawTime: new Date(data.winNotice.drawTime),
    winLevels: data.winNotice.winLevels,
    winNums: data.winNotice.winNums,
    winPoolInfo: data.winPoolInfoVo,
    isLatestIssue: data.isLatestIssue,
    rawResponse: data
  };

  // Persist
  await DrawResult.findOneAndUpdate(
    { gameId: doc.gameId, issue: doc.issue },
    doc,
    { upsert: true, new: true }
  );
  console.log('Persisted draw result to MongoDB');

  // Trigger export
  await exportResults();
  
  await mongoose.disconnect();
}

ingestAndExport().catch(console.error);
