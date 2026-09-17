import { normalizeFinancials } from './lottoEngine';

export function mapBackendResultToFrontend(result) {
  const rawDate = result.drawTime || result.date;
  const formattedDate = rawDate ? rawDate.split('T')[0] : null;

  return {
    id: result.id || result._id || (result.issue ? `draw-${result.issue}` : Math.random().toString(36).substr(2, 9)),
    date: formattedDate,
    drawNumber: result.issue,
    // Extract numbers from {winNum: '34'} structure and sort them numerically
    winningNumbers: (result.winNums || []).map(item => parseInt(item.winNum, 10)).sort((a, b) => a - b),
    prizePool: normalizeFinancials(result.winPoolInfo?.saleMoney || 0),
    prizeDivisions: (result.winLevels || []).map((level, index) => ({
      division: index + 1,
      label: `Div ${index + 1}`,
      match: level.matches || 'N/A',
      matches: level.winLevelName || 'N/A',
      winners: level.winCount || 0,
      payout: normalizeFinancials(level.winAmount || 0),
      prize: {
         amount: normalizeFinancials(level.winAmount || 0)
      }
    })),
  };
}

export function mapBackendPredictionToFrontend(pred) {
  return {
    id: pred._id,
    createdAt: pred.createdAt,
    targetDrawDate: pred.draw_date,
    boardsCount: pred.predicted_sets.length,
    cost: pred.financials.total_cost_rand,
    status: pred.actual_outcome.evaluated ? 'evaluated' : 'pending',
    evaluatedDrawId: pred.actual_outcome.evaluated ? pred.draw_date : null, // Simplified
    totalWon: pred.financials.total_payout_rand,
    netProfit: pred.financials.net_profit_loss_rand,
    topMatchCount: pred.evaluation_metrics.best_match_count,
    sets: pred.predicted_sets.map(set => ({
      id: set._id,
      setNumber: set.rank,
      numbers: set.numbers,
      confidenceScore: 90, // Placeholder as backend doesn't provide this
      matchedNumbers: pred.evaluation_metrics.matching_numbers || [],
      winAmount: 0, // Needs calculation in App.vue or derived from backend if available
    })),
  };
}
