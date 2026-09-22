// Simulator.js: Master Time Loop (Chronological replay)
import { DataGateway } from './DataGateway.js';
import { Backtester } from './Backtester.js';
import { Optimizer } from './Optimizer.js';
import { scoreAndFilterCandidates } from '../../candidateGenerator.js';
import Strategist from '../agents/Strategist.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEIGHTS_PATH = path.join(__dirname, '../config/weights.json');
const RULES_PATH = path.join(__dirname, '../config/rules.json');
const RESULTS_PATH = path.join(__dirname, '../results/audit_trail.json');

class Simulator {
  /**
   * @param {Object} config - Simulation configuration
   */
  async runSimulation(config) {
    console.log("Starting simulation...");
    
    // Initialize results file
    await fs.writeFile(RESULTS_PATH, JSON.stringify({}, null, 2));
    
    // 1. Initialization: Load historical data and initial configuration
    const historicalDraws = await DataGateway.getHistoricalDraws();
    const rulesConfig = JSON.parse(await fs.readFile(RULES_PATH, 'utf-8'));
    const rules = rulesConfig.rules;
    
    // 2. Master Loop
    for (let i = 0; i < historicalDraws.length; i++) {
      const draw = historicalDraws[i];
      
      // 3. Integration
      const rawCandidates = await this.generateCandidates(1000); 
      
      // Score and Filter using the current weights
      const weights = JSON.parse(await fs.readFile(WEIGHTS_PATH, 'utf-8'));
      const candidates = scoreAndFilterCandidates(rawCandidates, rules, 50, 'ADDITIVE_JITTER', weights);
      
      // Backtest: Evaluate performance
      const performance = Backtester.evaluate(candidates, draw, rules);
      
      // Persistence: Save audit trail
      await this.saveAuditTrail(draw.date, draw.winningNumbers, performance);
      
      // Optimize: Update weights based on performance
      await Optimizer.updateWeights(performance);

      // 4. Macro-Loop Control
      if (i > 0 && i % 50 === 0) {
        console.log(`\n--- Simulator: Macro-Loop check-in at iteration ${i} ---`);
        
        // Load current weights for display
        const currentWeights = JSON.parse(await fs.readFile(WEIGHTS_PATH, 'utf-8'));
        const tableData = Object.keys(currentWeights).map(ruleId => ({
            Rule: ruleId,
            Multiplier: currentWeights[ruleId].scoring.multiplier,
            LastSuccessRate: performance.ruleStats[ruleId]?.successRate?.toFixed(3) || 'N/A'
        }));
        console.table(tableData);
        
        await Strategist.reviewPerformance({ iteration: i, performance });
      }
    }
    
    console.log("Simulation complete.");
  }

  async saveAuditTrail(date, winningNumbers, performance) {
      const auditTrail = JSON.parse(await fs.readFile(RESULTS_PATH, 'utf-8'));
      auditTrail[date] = {
          winningNumbers,
          successfulSetsCount: performance.successfulSetsCount,
          failedSetsCount: performance.failedSetsCount,
          selectedSetsPerformance: performance.selectedSetsPerformance
      };
      await fs.writeFile(RESULTS_PATH, JSON.stringify(auditTrail, null, 2));
  }

  // Simplified candidate generator for simulation
  async generateCandidates(count) {
    const candidates = [];
    for(let i=0; i<count; i++) {
        const nums = Array.from({length: 5}, () => Math.floor(Math.random() * 36) + 1);
        candidates.push([...new Set(nums)].slice(0,5).sort((a,b)=>a-b));
    }
    return candidates;
  }
}

export default new Simulator();
