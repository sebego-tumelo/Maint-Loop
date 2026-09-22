// Optimizer.js: The Mathematician. Deterministic weight tuning.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEIGHTS_PATH = path.join(__dirname, '../config/weights.json');

export const Optimizer = {
  /**
   * Updates weights based on performance data using a gradient descent approach.
   * @param {Object} performance - The output from Backtester.evaluate()
   * @param {number} learningRate - Sensitivity of weight updates (default 0.05)
   * @returns {Promise<Array<string>>} Array of log messages
   */
  updateWeights: async (performance, learningRate = 0.05) => {
    // 1. Read existing weights
    const weights = JSON.parse(await fs.readFile(WEIGHTS_PATH, 'utf-8'));
    const logs = [];
    
    // 2. Iterate through rules present in performance data
    for (const [ruleId, stats] of Object.entries(performance.ruleStats)) {
      if (!weights[ruleId]) continue;

      const targetRate = 0.2; 
      const gradient = stats.successRate - targetRate;

      // Apply gradient update
      const oldMultiplier = weights[ruleId].scoring.multiplier || 1.0;
      let newMultiplier = oldMultiplier * (1 + gradient * learningRate);

      // 3. Constraints: Safety Rails (Keep multipliers between 0.1 and 3.0)
      newMultiplier = Math.max(0.1, Math.min(3.0, newMultiplier));

      // Update in memory
      weights[ruleId].scoring.multiplier = parseFloat(newMultiplier.toFixed(3));
      
      logs.push(`Optimizer: ${ruleId} success rate ${stats.successRate.toFixed(2)}. Multiplier: ${oldMultiplier} -> ${newMultiplier.toFixed(3)}`);
    }

    // 4. Persistence
    await fs.writeFile(WEIGHTS_PATH, JSON.stringify(weights, null, 2));
    return logs;
  }
};
