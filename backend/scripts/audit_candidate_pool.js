import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prediction } from '../models/Prediction.js';
import { DrawResult } from '../models/DrawResult.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function performAudit(prediction) {
  if (!prediction) {
    console.error(`❌ No prediction found.`);
    return;
  }
  const dateStr = prediction.draw_date;
  console.log(`\n--- CANDIDATE POOL AUDIT: ${dateStr} ---`);

  // 2. Fetch Draw Result
  const start = new Date(dateStr);
  const end = new Date(dateStr);
  end.setDate(end.getDate() + 1);
  
  const drawResult = await DrawResult.findOne({ 
    drawTime: { $gte: start, $lt: end } 
  });

  if (!drawResult) {
    console.error(`❌ No draw result found for date: ${dateStr}`);
    return;
  }

  // Extract winning numbers
  const winningNumbers = drawResult.winNums.map(n => parseInt(n.winNum)).sort((a, b) => a - b);
  console.log(`Winning Numbers: [${winningNumbers.join(', ')}]`);

  // 3. Audit Candidate Pool
  const pool = prediction.candidate_pool || [];
  const predictedSets = prediction.predicted_sets || [];
  
  // Helper to calculate matches
  const getMatches = (combination) => {
      const sorted = [...combination].sort((a, b) => a - b);
      return sorted.filter(n => winningNumbers.includes(n));
  };

  // Audit AI Selections
  console.log(`\n--- AI FINAL SELECTIONS (Performance) ---`);
  predictedSets.forEach(set => {
      const matches = getMatches(set.numbers);
      // Find the corresponding score from the pool for this set if it exists
      const poolSet = pool.find(c => JSON.stringify([...c.combination].sort((a,b) => a-b)) === JSON.stringify([...set.numbers].sort((a,b) => a-b)));
      const score = poolSet ? poolSet.composite_score : 'N/A';
      console.log(`Set ${set.rank}: [${set.numbers.join(', ')}] | Matches: ${matches.length} (${matches.join(', ')}) | Score: ${score}`);
  });

  const winners = [];
  const losers = [];

  // Helper to check if a combination was already picked by AI
  const wasPickedByAI = (candCombo) => {
      const sortedCand = [...candCombo].sort((a, b) => a - b);
      return predictedSets.some(set => {
          const sortedSet = [...set.numbers].sort((a, b) => a - b);
          return JSON.stringify(sortedCand) === JSON.stringify(sortedSet);
      });
  };

  pool.forEach(cand => {
    const combination = cand.combination.sort((a, b) => a - b);
    
    // Skip if AI already picked this set
    if (wasPickedByAI(combination)) return;

    const matches = getMatches(combination);
    
    const auditResult = {
      combination,
      matches,
      count: matches.length,
      score: cand.composite_score
    };

    if (matches.length > 0) {
      winners.push(auditResult);
    } else {
      losers.push(auditResult);
    }
  });

  // 4. Report
  console.log(`\n--- POOL AUDIT (Missed Opportunities / Excludes AI Picks) ---`);
  console.log(`--- WINNERS (${winners.length} found) ---`);
  winners.sort((a, b) => b.count - a.count).forEach(w => {
    console.log(`[${w.combination.join(', ')}] | Matches: ${w.count} (${w.matches.join(', ')}) | Score: ${w.score}`);
  });

  console.log(`\n--- LOSERS (${losers.length} sets) ---`);
  console.log(`${losers.length} sets had zero matches.`);
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const args = process.argv.slice(2);
    
    if (args.includes('--latest')) {
      const prediction = await Prediction.findOne().sort({ draw_date: -1 });
      await performAudit(prediction);
    } else if (args.includes('--recent')) {
      const nIdx = args.indexOf('--recent');
      const n = parseInt(args[nIdx + 1]) || 1;
      const predictions = await Prediction.find().sort({ draw_date: -1 }).limit(n);
      for (const prediction of predictions) {
        await performAudit(prediction);
      }
    } else {
      const dateIdx = args.indexOf('--date');
      const dateStr = dateIdx !== -1 ? args[dateIdx + 1] : new Date().toISOString().split('T')[0];
      const prediction = await Prediction.findOne({ draw_date: dateStr });
      await performAudit(prediction);
    }

  } catch (err) {
    console.error('❌ Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
