import { scoreAndFilterCandidates } from '../../backend/candidateGenerator.js';

// Backtester.js: The Judge. Evaluates performance against historical draws.
export const Backtester = {
  /**
   * @param {Array} candidates - Array of candidate sets (portfolio)
   * @param {Object} drawResult - The historical draw result (winningNumbers)
   * @param {Array} ruleDefinitions - Active rule definitions
   */
  evaluate: (candidates, drawResult, ruleDefinitions) => {
    console.log(`Backtester: Evaluating ${candidates.length} candidates against draw ${drawResult.drawNumber}`);
    
    const winningNumbers = drawResult.winningNumbers;
    const performance = {
      ruleStats: {}, // Maps ruleId -> { satisfied: 0, winning: 0 }
      totalCandidates: candidates.length,
      winnersFound: 0
    };

    candidates.forEach(cand => {
      // 1. Calculate matches
      const matches = cand.combination.filter(n => winningNumbers.includes(n));
      const isWinner = matches.length > 0;

      if (isWinner) performance.winnersFound++;

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

    return performance;
  }
};
