import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUnifiedDrawHistory } from '../utils/unifiedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function auditNewRules() {
  try {
    const draws = await getUnifiedDrawHistory();
    console.log(`\n--- RULE DISCOVERY AUDIT: Analyzing ${draws.length} historical draws ---\n`);

    const stats = {
      consecutivePairs: 0,
      lowHighSplits: { // Count of low numbers (1-18) per draw
        '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
      },
      sumRanges: {
        '0-50': 0, '51-70': 0, '71-90': 0, '91-110': 0, '111-130': 0, '131+': 0
      }
    };

    draws.forEach(draw => {
      const nums = draw.winningNumbers;
      
      // 1. Consecutive Pairs
      let hasConsecutive = false;
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i + 1] === nums[i] + 1) hasConsecutive = true;
      }
      if (hasConsecutive) stats.consecutivePairs++;

      // 2. Low/High Split (1-18 Low, 19-36 High)
      const lowCount = nums.filter(n => n <= 18).length;
      stats.lowHighSplits[lowCount.toString()]++;

      // 3. Sum Distribution
      const sum = nums.reduce((a, b) => a + b, 0);
      if (sum <= 50) stats.sumRanges['0-50']++;
      else if (sum <= 70) stats.sumRanges['51-70']++;
      else if (sum <= 90) stats.sumRanges['71-90']++;
      else if (sum <= 110) stats.sumRanges['91-110']++;
      else if (sum <= 130) stats.sumRanges['111-130']++;
      else stats.sumRanges['131+']++;
    });

    console.log('--- PATTERN PREVALENCE ---');
    console.log(`Consecutive Pairs: ${((stats.consecutivePairs / draws.length) * 100).toFixed(2)}% of winning sets`);
    
    console.log('\nLow Numbers (1-18) count per winning draw:');
    Object.entries(stats.lowHighSplits).forEach(([k, v]) => {
      console.log(`  ${k} Low numbers: ${((v / draws.length) * 100).toFixed(2)}%`);
    });

    console.log('\nSum Distribution:');
    Object.entries(stats.sumRanges).forEach(([k, v]) => {
      console.log(`  Sum ${k}: ${((v / draws.length) * 100).toFixed(2)}%`);
    });

  } catch (err) {
    console.error('Audit failed:', err);
  }
}

auditNewRules();
