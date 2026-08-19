import fs from 'fs/promises';
import path from 'path';
import { LottoMetadata } from './models/LottoMetadata.js';

export async function writeToScrapbook(data) {
  const dir = path.join(process.cwd(), 'backend', 'scrapbook');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'output.json'), JSON.stringify(data, null, 2));
}

export async function syncAndGetStats() {
  const apiBaseUrl = process.env.LOTTERY_API_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${apiBaseUrl}/api/results`);
  if (!response.ok) throw new Error('Failed to fetch results');
  const result = await response.json();
  const data = result.data || [];

  const totalRecords = data.length;
  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestResult = sortedData[0] || { date: 'N/A', numbers: [] };

  const meta = await LottoMetadata.findOne({});
  const analysis = meta ? meta.analysis : null;

  return { totalRecords, latestResult, analysis, rawDrawHistory: data };
}
