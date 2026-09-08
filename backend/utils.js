import { LottoMetadata } from './models/LottoMetadata.js';
import { DrawResult } from './models/DrawResult.js';

export async function syncAndGetStats() {
  // Fetch from DB instead of external API
  const data = await DrawResult.find().sort({ 'issue': -1 });

  // Map to the format expected by the frontend
  const mappedData = data.map(doc => ({
    id: doc._id,
    drawNumber: doc.issue,
    date: doc.drawTime.toISOString().split('T')[0],
    winningNumbers: doc.winNums.map(n => parseInt(n.winNum)),
    prizePool: doc.winPoolInfo?.nextJackpot || 0,
    prizeDivisions: (doc.winLevels || []).map(level => ({
      division: level.winLevelId,
      label: level.winLevelName,
      match: level.matches,
      matches: level.matches,
      winners: level.winCount,
      payout: level.winAmount,
      prize: { amount: level.winAmount }
    }))
  }));

  const totalRecords = mappedData.length;
  const latestResult = mappedData[0] || { date: 'N/A', numbers: [] };

  const meta = await LottoMetadata.findOne({});
  const analysis = meta ? meta.analysis : null;

  return { totalRecords, latestResult, analysis, rawDrawHistory: mappedData };
}
