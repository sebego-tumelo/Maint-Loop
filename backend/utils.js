import { LottoMetadata } from './models/LottoMetadata.js';
import { DrawResult } from './models/DrawResult.js';

export async function syncAndGetStats() {
  // Fetch from DB instead of external API
  const data = await DrawResult.find().sort({ 'issue': -1 });

  // Map to the format expected by the frontend/analysis workflow
  const mappedData = data.map(doc => ({
    date: doc.drawTime.toISOString().split('T')[0],
    numbers: doc.winNums.map(n => parseInt(n.winNum)),
    issue: doc.issue
  }));

  const totalRecords = mappedData.length;
  const latestResult = mappedData[0] || { date: 'N/A', numbers: [] };

  const meta = await LottoMetadata.findOne({});
  const analysis = meta ? meta.analysis : null;

  return { totalRecords, latestResult, analysis, rawDrawHistory: mappedData };
}
