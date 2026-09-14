import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connects to both the local DB and the daily-lotto-scraper-api DB,
 * fetches all draw results, and normalizes them into a standard format.
 */
export async function getUnifiedDrawHistory() {
  const localUri = process.env.MONGODB_URI;
  const scraperUri = localUri.replace(/\/([^/]+)$/, '/daily-lotto-scraper-api');

  // Connect to both
  const localConn = await mongoose.createConnection(localUri).asPromise();
  const scraperConn = await mongoose.createConnection(scraperUri).asPromise();

  try {
    // Fetch local DrawResults
    const localDraws = await localConn.collection('drawresults').find({}).toArray();
    const localNormalized = localDraws.map(d => ({
        date: d.drawTime,
        winningNumbers: d.winNums.map(wn => parseInt(wn.winNum)).sort((a,b) => a-b)
    }));

    // Fetch scraper DrawResults
    const scraperDraws = await scraperConn.collection('drawresults').find({}).toArray();
    const scraperNormalized = scraperDraws.map(d => ({
        date: new Date(d.drawDate),
        winningNumbers: d.winningNumbers.map(n => parseInt(n)).sort((a,b) => a-b)
    }));

    // Merge and Deduplicate by date
    const merged = [...localNormalized, ...scraperNormalized];
    const uniqueMap = new Map();
    merged.forEach(d => {
        const dateStr = d.date.toISOString().split('T')[0];
        if (!uniqueMap.has(dateStr)) {
            uniqueMap.set(dateStr, d);
        }
    });

    return Array.from(uniqueMap.values());
  } finally {
    await localConn.close();
    await scraperConn.close();
  }
}
