export const BOARD_PRICE_ZAR = 3; // R3 per board
export const DEFAULT_BOARD_COUNT = 3; // R9 per draw

// Standard Daily Lotto payouts estimate table
export function calculatePrizeForMatches(matchCount, prizePool = 450000) {
  switch (matchCount) {
    case 5:
      return Math.round(prizePool * 0.356); // approx R160,000 - R400,000
    case 4:
      return 420; // average R420
    case 3:
      return 22;  // average R22
    case 2:
      return 6;   // average R6
    default:
      return 0;
  }
}

// Generate default prize divisions for a draw
export function generateDivisions(winningNumbers, prizePool = 450000) {
  return [
    { match: 5, label: 'Match 5 (Div 1)', winners: 1, payout: Math.round(prizePool * 0.356), percentage: '35.6%' },
    { match: 4, label: 'Match 4 (Div 2)', winners: 184, payout: 420, percentage: '33.7%' },
    { match: 3, label: 'Match 3 (Div 3)', winners: 4320, payout: 22, percentage: '21.4%' },
    { match: 2, label: 'Match 2 (Div 4)', winners: 38450, payout: 6, percentage: '9.3%' },
  ];
}

// Generate random unique 5 numbers from 1 to 36
export function generateCandidateSet(setNumber, strategy = 'balanced') {
  const numbers = [];
  const pool = Array.from({ length: 36 }, (_, i) => i + 1);
  
  while (numbers.length < 5) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool.splice(randomIndex, 1)[0];
    numbers.push(selected);
  }

  numbers.sort((a, b) => a - b);
  const confidenceScore = Math.floor(88 + Math.random() * 9.5);

  return {
    id: `set-${Date.now()}-${setNumber}-${Math.random().toString(36).substring(2, 6)}`,
    setNumber,
    numbers,
    confidenceScore,
  };
}

// Generate multiple sets
export function generatePredictionBoards(count = 3) {
  return Array.from({ length: count }, (_, i) => generateCandidateSet(i + 1));
}

// Evaluate prediction sets against winning numbers
export function evaluatePredictionSets(sets, winningNumbers) {
  let totalWon = 0;
  let topMatch = 0;

  const evaluatedSets = sets.map((set) => {
    const matchedNumbers = set.numbers.filter((num) => winningNumbers.includes(num));
    const matchCount = matchedNumbers.length;
    const winAmount = calculatePrizeForMatches(matchCount);

    if (matchCount > topMatch) {
      topMatch = matchCount;
    }
    totalWon += winAmount;

    return {
      ...set,
      matchedNumbers,
      winAmount,
    };
  });

  return {
    evaluatedSets,
    totalWon,
    topMatch,
  };
}

// Compute financial statistics from predictions
export function computeFinancialStats(predictions, currentActivePrediction) {
  const evaluated = predictions.filter((p) => p.status === 'evaluated');
  
  const currentDrawCost = currentActivePrediction 
    ? currentActivePrediction.cost 
    : DEFAULT_BOARD_COUNT * BOARD_PRICE_ZAR;

  const lifetimeSpent = predictions.reduce((acc, p) => acc + p.cost, 0);
  const lifetimeWon = evaluated.reduce((acc, p) => acc + (p.totalWon || 0), 0);
  const netProfit = lifetimeWon - lifetimeSpent;
  
  const roiPercentage = lifetimeSpent > 0 ? (netProfit / lifetimeSpent) * 100 : 0;
  const winningDrawsCount = evaluated.filter((p) => (p.totalWon || 0) > 0).length;
  
  let bestSingleWin = 0;
  evaluated.forEach((p) => {
    if (p.totalWon > bestSingleWin) bestSingleWin = p.totalWon;
  });

  return {
    currentDrawCost,
    lifetimeSpent,
    lifetimeWon,
    netProfit,
    roiPercentage,
    totalDrawsEvaluated: evaluated.length,
    winningDrawsCount,
    bestSingleWin,
  };
}

// Format ZAR currency
export function formatZAR(amount) {
  const formatted = Math.abs(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return amount < 0 ? `-R${formatted}` : `R${formatted}`;
}

// Format sign prefixed ZAR
export function formatSignedZAR(amount) {
  const formatted = Math.abs(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  if (amount > 0) return `+R${formatted}`;
  if (amount < 0) return `-R${formatted}`;
  return `R0`;
}
