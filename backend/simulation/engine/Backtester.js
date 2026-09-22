import { scoreAndFilterCandidates } from '../../candidateGenerator.js';

// Backtester.js: The Judge. Evaluates performance against historical draws.
export const Backtester = {
  /**
   * @param {Array} candidates - Array of candidate sets (portfolio)
   * @param {Object} drawResult - The historical draw result (winningNumbers)
   * @param {Array} ruleDefinitions - Active rule definitions
   */
  evaluate: (candidates, drawResult, ruleDefinitions) => {
    
    const winningNumbers = drawResult.winningNumbers;
    const performance = {
      ruleStats: {},
      selectedSetsPerformance: [],
      totalCandidates: candidates.length,
      successfulSetsCount: 0,
      failedSetsCount: 0,
      bestMatch: 0
    };

    candidates.forEach(cand => {
      // 1. Calculate matches
      const matches = cand.combination.filter(n => winningNumbers.includes(n));
      const matchCount = matches.length;
      const isWinner = matchCount > 0;

      if (matchCount > performance.bestMatch) {
          performance.bestMatch = matchCount;
      }

      // Track set performance
      performance.selectedSetsPerformance.push({
          combination: cand.combination,
          matchCount: matchCount,
          matches: matches
      });

      if (isWinner) {
          performance.successfulSetsCount++;
      } else {
          performance.failedSetsCount++;
      }

      // 2. Track rule satisfaction
      if (cand.metrics && cand.metrics.satisfied_rules) {
        cand.metrics.satisfied_rules.forEach(ruleId => {
          if (!performance.ruleStats[ruleId]) {
            performance.ruleStats[ruleId] = { satisfied: 0, winning: 0 };
          }
          performance.ruleStats[ruleId].satisfied++;
          if (isWinner) {
            performance.ruleStats[ruleId].winning++;
          }
        });
      }
    });

    // Calculate final success rates for the optimizer
    for (const ruleId in performance.ruleStats) {
      const stats = performance.ruleStats[ruleId];
      stats.successRate = stats.satisfied > 0 ? stats.winning / stats.satisfied : 0;
    }

    // Calculate overall portfolio success/failure rates
    const total = performance.successfulSetsCount + performance.failedSetsCount;
    performance.success_rate = total > 0 ? ((performance.successfulSetsCount / total) * 100).toFixed(0) + '%' : '0%';
    performance.failure_rate = total > 0 ? ((performance.failedSetsCount / total) * 100).toFixed(0) + '%' : '100%';

    return performance;
  }
};
