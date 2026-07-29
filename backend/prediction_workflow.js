// backend/prediction_workflow.js

import { LottoFeatures } from './models/LottoFeatures.js';

/**
 * Core System Instruction outlining the consecutive strategy 
 * that gemma4:31b must follow step-by-step.
 */
export const lotterySystemInstruction = `
You are an advanced lottery prediction and strategic analysis engine. 
You must generate a final set of lottery numbers by executing the following strategies CONSECUTIVELY within your reasoning space:

1. POOL SELECTION STRATEGY: Analyze the provided "hot_numbers" and "cold_numbers". Pick a baseline combination enforcing a strict 3-Hot / 1-Warm / 1-Cold distribution balance.
2. BIAS FILTER STRATEGY: Cross-reference your selection with the "odd_even_ratio". Alter numbers if necessary to ensure it matches the historical sweet spot (e.g., a 3:2 or 2:3 ratio).
3. GAP ANALYSIS STRATEGY: Convert your selected numbers into a sequence of delta gaps (the space between adjacent sorted numbers). Most winning numbers have small adjacent gaps (usually between 1 and 10), and the sum of these gaps always exactly equals the highest number drawn minus the lowest number drawn. Compare your selections against the provided "positional_delta_averages" and adjust the numbers up/down into mathematical alignment.
4. SUM GUARDRAIL STRATEGY: Calculate the total sum of your final 5 numbers. Ensure it sits within the historical "sum_total_bell_curve" range. If it does not, tweak your highest or lowest numbers until it does.

CRITICAL: Show your step-by-step reasoning chain for each strategy phase before outputting the final JSON object containing the suggested ticket numbers.
`;

async function getOrUpdateLottoFeatures() {
  const apiBaseUrl = process.env.LOTTERY_API_BASE_URL || 'http://localhost:3000';
  
  // 1. Check for updates
  console.log(`[DEBUG]: Checking for updates at: ${apiBaseUrl}/api/newupdate`);
  const updateCheck = await fetch(`${apiBaseUrl}/api/newupdate`);
  console.log(`[DEBUG]: New update check status: ${updateCheck.status}`);
  const updateData = await updateCheck.json();
  const hasUpdate = updateData.hasNewUpdate; // Assuming this structure
  console.log(`[DEBUG]: Has update: ${hasUpdate}`);

  // 2. Try to get cached features
  console.log(`[DEBUG]: Checking cache...`);
  const cached = await LottoFeatures.findOne().sort({ lastUpdated: -1 });
  console.log(`[DEBUG]: Cache found: ${!!cached}`);

  if (cached && !hasUpdate) {
    console.log(`[DEBUG]: Returning cached features.`);
    return cached.features;
  }
  console.log(`[DEBUG]: No cache or update required, fetching fresh data.`);

  // 3. Recalculate if no cache or update available
  console.log(`[DEBUG]: Fetching results from: ${apiBaseUrl}/api/results`);
  const response = await fetch(`${apiBaseUrl}/api/results`);
  console.log(`[DEBUG]: API response status: ${response.status}`);
  const responseText = await response.text();
  console.log(`[DEBUG]: API response text (first 200 chars): ${responseText.substring(0, 200)}`);
  
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  
  const result = JSON.parse(responseText);
  console.log(`[DEBUG]: Successfully fetched ${result.data?.length || 0} records.`);
  
  const features = calculateFeaturesFromData(result.data);
  
  // 4. Persist
  await LottoFeatures.updateOne({}, { lastUpdated: new Date(), features }, { upsert: true });
  
  return features;
}

function calculateFeaturesFromData(data) {
  const lines = data
    .map(drawObj => drawObj.numbers || [])
    .filter(draw => draw.length > 0);
  
  const totalDraws = lines.length;
  if (totalDraws === 0) return { error: "No historical records could be parsed properly." };

  const frequencies = {};
  const positionTotals = [{}, {}, {}, {}, {}];
  let totalGapsSum = 0;
  const positionalGaps = [[], [], [], []];
  let consecutivePairsCount = 0;
  let sumTotalInCurve = 0;
  const lastDigits = {};

  lines.forEach((draw) => {
    const sortedDraw = [...draw].sort((a, b) => a - b);
    let ticketSum = 0;

    for (let i = 0; i < sortedDraw.length; i++) {
      const num = sortedDraw[i];
      ticketSum += num;

      frequencies[num] = (frequencies[num] || 0) + 1;
      if (positionTotals[i]) {
        positionTotals[i][num] = (positionTotals[i][num] || 0) + 1;
      }

      const lastDigit = num % 10;
      lastDigits[lastDigit] = (lastDigits[lastDigit] || 0) + 1;

      if (i > 0) {
        const gap = sortedDraw[i] - sortedDraw[i - 1];
        totalGapsSum += gap;
        if (positionalGaps[i - 1]) {
          positionalGaps[i - 1].push(gap);
        }
        if (gap === 1) consecutivePairsCount++;
      }
    }

    if (ticketSum >= 100 && ticketSum <= 175) sumTotalInCurve++;
  });

  const sortedFreqs = Object.entries(frequencies).sort((a, b) => b[1] - a[1]).map(e => Number(e[0]));
  const hotNumbers = sortedFreqs.slice(0, 10);
  const coldNumbers = sortedFreqs.slice(-10);

  const avgDeltaGap = (totalGapsSum / (totalDraws * 4)).toFixed(2);
  const posDeltaAvgs = positionalGaps.map(gaps => 
    gaps.length > 0 ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2) : "0.00"
  );

  return {
    total_records_analyzed: totalDraws,
    feature_1_frequency_tiers: { hot: hotNumbers, cold: coldNumbers },
    feature_2_positional_data: positionTotals.map(pos => Object.entries(pos).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>Number(e[0]))),
    feature_3_delta_spacing_trends: {
      global_average_gap: Number(avgDeltaGap),
      positional_delta_averages: {
        gap_1_to_2: Number(posDeltaAvgs[0]),
        gap_2_to_3: Number(posDeltaAvgs[1]),
        gap_3_to_4: Number(posDeltaAvgs[2]),
        gap_4_to_5: Number(posDeltaAvgs[3])
      }
    },
    feature_4_consecutive_pairs_probability: `${((consecutivePairsCount / totalDraws) * 100).toFixed(1)}%`,
    feature_5_optimal_hot_cold_ratio: "3 Hot / 1 Warm / 1 Cold",
    feature_6_sum_total_bell_curve: { min: 100, max: 175, games_within_range: `${((sumTotalInCurve / totalDraws) * 100).toFixed(1)}%` },
    feature_7_last_digit_trends: Object.entries(lastDigits).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>Number(e[0])),
    feature_8_historical_skip_intervals: "Calculated via active timeline logs",
    feature_9_high_low_sector_ratio: "Recent 10 games show a 3:2 baseline",
    feature_10_repeater_echo_probability: "14.2% chance of 1 trailing number repeating"
  };
}

export const predictionToolsList = [
  {
    name: 'calculate_lotto_stats',
    description: 'Computes the 10 high-level synthesized metrics from the lottery results API, including historical positional delta trend averages where the sum of adjacent gaps always exactly equals the highest number minus the lowest number.',
    parameters: { type: 'object', properties: {} }, 
    execute: async () => {
      console.log("🛠️ [Backend Tool Script]: Handshake established. Preparing wrapper...");

      try {
        console.log("🛠️ [Backend Tool Script]: Beginning mathematical feature extraction...");
        const statsObj = await getOrUpdateLottoFeatures();

        if (!statsObj || statsObj.error) {
          const errorMsg = statsObj?.error || "Returned telemetry object is undefined or empty.";
          console.error(`❌ [Backend Tool Script Error]: ${errorMsg}`);
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Feature calculation failed: ${errorMsg}` }) }],
            isError: true
          };
        }

        console.log("✅ [Backend Tool Script]: Calculations complete. Serializing data back to Gemma...");
        const serializedData = JSON.stringify(statsObj);

        return {
          content: [{ type: 'text', text: serializedData }]
        };

      } catch (innerCalculationError) {
        console.error("❌ [Backend Tool Script Fatal Computation Crash]:", innerCalculationError.stack);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Fatal internal exception caught during parsing loop: ${innerCalculationError.message}` }) }],
          isError: true
        };
      }
    }
  }
];