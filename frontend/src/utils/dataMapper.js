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
