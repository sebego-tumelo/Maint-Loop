/**
 * Loads raw historical draws and builds a Set for O(1) duplicate checks
 */
export async function loadHistoricalDrawSets() {
  const apiBaseUrl = process.env.LOTTERY_API_BASE_URL || 'http://localhost:3000';
  const drawSet = new Set();
  
  try {
    const res = await fetch(`${apiBaseUrl}/api/results`);
    if (!res.ok) return drawSet;
    const json = await res.json();
    const records = json.data || [];

    for (const record of records) {
      const numbers = record.winningNumbers || record.numbers || [];
      if (numbers.length === 5) {
        const sortedKey = [...numbers].sort((a, b) => a - b).join('-');
        drawSet.add(sortedKey);
      }
    }
  } catch (err) {
    console.error('⚠️ [Candidate Generator] Failed to load draw history for uniqueness check:', err.message);
  }

  return drawSet;
}

/**
 * Generates candidate combinations and discards exact historical matches
 */
export async function generateUniqueCandidates(count = 1000) {
  const historicalDraws = await loadHistoricalDrawSets();
  const validCandidates = [];
  const candidateKeys = new Set();

  while (validCandidates.length < count) {
    const numbers = [];
    while (numbers.length < 5) {
      const num = Math.floor(Math.random() * 36) + 1;
      if (!numbers.includes(num)) numbers.push(num);
    }

    numbers.sort((a, b) => a - b);
    const candidateKey = numbers.join('-');

    if (!historicalDraws.has(candidateKey) && !candidateKeys.has(candidateKey)) {
      candidateKeys.add(candidateKey);
      validCandidates.push(numbers);
    }
  }

  return validCandidates;
}

/**
 * Scores candidates purely against observed rules
 */
export function scoreAndFilterCandidates(candidates, activeRules = [], limit = 20) {
  const scoredCandidates = candidates.map(candidate => {
    let compositeScore = 1.0;
    const sorted = [...candidate].sort((a, b) => a - b);
    
    const sum = sorted.reduce((a, b) => a + b, 0);
    const oddCount = sorted.filter(n => n % 2 !== 0).length;
    const decades = new Set(sorted.map(n => Math.floor(n / 10))).size;

    // Apply active observed rules dynamically
    for (const rule of activeRules) {
      if (rule.rule_id === "RULE_DECADE_SPREAD_01") {
        if (decades < 3 && rule.scoring?.penalty_if_violated) {
          compositeScore += rule.scoring.penalty_if_violated;
        }
      }

      if (rule.rule_id === "RULE_SUM_WINDOW_TIGHTENED_02") {
        if (sum >= 71 && sum <= 110) {
          compositeScore += (rule.scoring?.multiplier || 1.5);
        } else if (rule.scoring?.penalty_if_violated) {
          compositeScore += rule.scoring.penalty_if_violated;
        }
      }

      if (rule.rule_id === "RULE_EVEN_ODD_BALANCE_05") {
        if (oddCount === 2 || oddCount === 3) {
          compositeScore += (rule.scoring?.multiplier || 0.5);
        }
      }

      if (rule.rule_id === "RULE_CONSECUTIVE_PAIRS_04") {
        const hasConsecutive = sorted.some((n, i) => i > 0 && n === sorted[i-1] + 1);
        if (hasConsecutive) {
          compositeScore += (rule.scoring?.multiplier || 1.0);
        } else if (rule.scoring?.penalty_if_violated) {
          compositeScore += rule.scoring.penalty_if_violated;
        }
      }

      if (rule.rule_id === "RULE_LOW_NUMBERS_07") {
        const lowCount = sorted.filter(n => n <= 18).length;
        if (lowCount === 2 || lowCount === 3) {
          compositeScore += (rule.scoring?.multiplier || 1.0);
        } else if (rule.scoring?.penalty_if_violated) {
          compositeScore += rule.scoring.penalty_if_violated;
        }
      }
    }

    // Add random jitter to break ties (0.0000 - 0.0009)
    const jitter = Math.random() * 0.001;
    compositeScore += jitter;

    return {
      combination: sorted,
      metrics: { sum, parity: `${oddCount}:${5 - oddCount}`, decade_spread: decades },
      composite_score: parseFloat(compositeScore.toFixed(5))
    };
  });

  return scoredCandidates
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, limit);
}
