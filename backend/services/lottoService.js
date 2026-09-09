import mongoose from 'mongoose';
import { DrawResult } from '../models/DrawResult.js';

const SOURCE_DB = 'daily-lotto-scraper-api';
const GAME_ID = 11001;

// Establish connection to Source DB
const sourceDb = mongoose.connection.useDb(SOURCE_DB);
const SourceModel = sourceDb.model('drawresults', new mongoose.Schema({}, { strict: false }), 'drawresults');

function transformRecord(doc) {
  const drawTime = new Date(doc.drawDate);
  return {
    gameId: GAME_ID,
    issue: 0, // In-memory transformation doesn't need to persist issue
    drawTime: drawTime,
    isLatestIssue: false,
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
        nextDrawTime: drawTime
    },
    rawResponse: doc
  };
}

export async function getMergedDrawResults(limit = 20) {
  // 1. Fetch from Target DB B
  const dbBResults = await DrawResult.find().sort({ drawTime: -1 }).limit(limit).lean();

  // 2. Fetch from Source DB A
  const dbARecords = await SourceModel.find().sort({ drawDate: -1 }).limit(limit).lean();
  
  const transformedARecords = dbARecords.map(transformRecord);

  // 3. Merge, sort, and limit
  const merged = [...dbBResults, ...transformedARecords]
    .sort((a, b) => b.drawTime - a.drawTime);
    
  // Deduplicate based on drawDate (to avoid showing the same draw from both DBs)
  const uniqueResults = [];
  const seenDates = new Set();
  for (const res of merged) {
    const dateStr = res.drawTime.toISOString().split('T')[0];
    if (!seenDates.has(dateStr)) {
      uniqueResults.push(res);
      seenDates.add(dateStr);
    }
  }

  return uniqueResults.slice(0, limit);
}
