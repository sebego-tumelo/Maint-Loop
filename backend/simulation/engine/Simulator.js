import { DataGateway } from './DataGateway.js';
import { Backtester } from './Backtester.js';
import { Optimizer } from './Optimizer.js';
import { scoreAndFilterCandidates } from '../../candidateGenerator.js';
import Strategist from '../agents/Strategist.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEIGHTS_PATH = path.join(__dirname, '../config/weights.json');
const RULES_PATH = path.join(__dirname, '../config/rules.json');
const RESULTS_PATH = path.join(__dirname, '../results/audit_trail.json');

class Simulator {
  constructor() {
    this.dashboardLines = 0;
  }

  // Helper to render the dashboard
  renderDashboard(drawDate, optimizerLogs, tableData, matchFrequency, isMacroLoop = false) {
    // 1. Move to top-left of dashboard area (if we have previously drawn)
    if (this.dashboardLines > 0) {
      process.stdout.write(`\x1b[${this.dashboardLines}A\r`);
    }

    // 2. Clear previous dashboard content
    process.stdout.write(`\x1b[J`); // Clear from cursor down

    // 3. Render Optimizer block
    process.stdout.write(`Processing Draw N/A (${drawDate})...\n`);
    optimizerLogs.forEach(log => {
      process.stdout.write(`  ${log}\n`);
    });

    // 4. Render Table (if available)
    if (tableData) {
      console.table(tableData);
      
      // 5. Render Frequency (Yellow)
      process.stdout.write(`\x1b[33mMatch Frequency: ${JSON.stringify(matchFrequency)}\x1b[0m\n`);
      
      // 6. Blue line
      process.stdout.write(`\x1b[34m` + "=".repeat(50) + `\x1b[0m\n`);
    }

    // Calculate lines written (Processing(1) + Logs(5) + Table(header+5+1) + Freq(1) + BlueLine(1))
    // Note: console.table adds a lot of lines.
    // For simplicity, let's just make the dashboard fixed size by clearing the *entire screen*
    // but without scrolling.
  }

  // Revised rendering strategy: Clear screen once, always move cursor to home
  renderDashboardFixed(drawDate, optimizerLogs, tableData, matchFrequency, strategistResult) {
      let output = '\x1b[H'; // Cursor to home
      output += `Processing Draw N/A (${drawDate})...\n\n`;
      
      optimizerLogs.forEach(log => {
          output += `  ${log}\n`;
      });
      output += `\n`;

      if (tableData) {
          // Manual table rendering
          output += `Rule`.padEnd(35) + `Multiplier`.padEnd(15) + `LastSuccessRate` + `\n`;
          output += `-`.repeat(65) + `\n`;
          tableData.forEach(row => {
              output += `${row.Rule}`.padEnd(35) + `${row.Multiplier}`.padEnd(15) + `${row.LastSuccessRate}` + `\n`;
          });
          output += `\n\x1b[33mMatch Frequency: ${JSON.stringify(matchFrequency)}\x1b[0m\n`;
          
          if (strategistResult) {
              output += `\nStrategist Summary: ${strategistResult.summary}\n`;
              strategistResult.adjustments.forEach(adj => {
                  output += `  ${adj}\n`;
              });
          }
          
          output += `\n\x1b[34m` + "=".repeat(50) + `\x1b[0m\n`;
      }
      process.stdout.write(output);
  }
  /**
   * @param {Object} config - Simulation configuration
   */
  async runSimulation(config) {
    // Reset weights if not a dry run
    if (!config.subset) {
        await this.resetWeights();
    }
    
    // Initialize results file
    await fs.writeFile(RESULTS_PATH, JSON.stringify({}, null, 2));
    
    // Clear screen once
    process.stdout.write('\x1b[2J');
    
    // 1. Initialization
    const historicalDraws = config.subset || await DataGateway.getHistoricalDraws();
    const rulesConfig = JSON.parse(await fs.readFile(RULES_PATH, 'utf-8'));
    const rules = rulesConfig.rules;
    
    let lastTableData = null;
    let lastFrequency = null;
    let lastStrategistResult = null;

    // 2. Master Loop
    for (let i = 0; i < historicalDraws.length; i++) {
      const draw = historicalDraws[i];
      
      // 3. Integration
      const rawCandidates = await this.generateCandidates(1000); 
      const weights = JSON.parse(await fs.readFile(WEIGHTS_PATH, 'utf-8'));
      const candidates = scoreAndFilterCandidates(rawCandidates, rules, 50, 'ADDITIVE_JITTER', weights);
      const performance = Backtester.evaluate(candidates, draw, rules);
      
      await this.saveAuditTrail(draw.date, draw.winningNumbers, performance);
      const optimizerLogs = await Optimizer.updateWeights(performance);

      // 4. Update Dashboard
      if (i > 0 && i % 50 === 0) {
        lastTableData = Object.keys(weights).map(ruleId => ({
            Rule: ruleId,
            Multiplier: weights[ruleId].scoring.multiplier,
            LastSuccessRate: performance.ruleStats[ruleId]?.successRate?.toFixed(3) || 'N/A'
        }));
        
        lastFrequency = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        performance.selectedSetsPerformance.forEach(set => {
            if (lastFrequency.hasOwnProperty(set.matchCount)) {
                lastFrequency[set.matchCount]++;
            }
        });
        
        lastStrategistResult = await Strategist.reviewPerformance({ iteration: i, performance });
      }

      this.renderDashboardFixed(draw.date, optimizerLogs, lastTableData, lastFrequency, lastStrategistResult);
    }
  }

  async saveAuditTrail(date, winningNumbers, performance) {
      try {
          const content = await fs.readFile(RESULTS_PATH, 'utf-8');
          const auditTrail = JSON.parse(content);
          
          auditTrail[date] = {
              winningNumbers,
              successfulSetsCount: performance.successfulSetsCount,
              failedSetsCount: performance.failedSetsCount,
              success_rate: performance.success_rate,
              failure_rate: performance.failure_rate,
              bestMatch: performance.bestMatch,
              selectedSetsPerformance: performance.selectedSetsPerformance
          };
          
          await fs.writeFile(RESULTS_PATH, JSON.stringify(auditTrail, null, 2));
          // Removed console.log here to prevent dashboard flickering
      } catch (err) {
          // console.error(`Simulator: Error saving audit trail for ${date}:`, err);
      }
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

  async resetWeights() {
    console.log("Simulator: Resetting weights to base values...");
    const baseWeights = {
        "RULE_CONSECUTIVE_PAIRS_04": { "scoring": { "multiplier": 1, "penalty_if_violated": 0 } },
        "RULE_SUM_WINDOW_TIGHTENED_02": { "scoring": { "multiplier": 1, "penalty_if_violated": 0 } },
        "RULE_LOW_NUMBERS_07": { "scoring": { "multiplier": 1, "penalty_if_violated": 0 } },
        "RULE_DECADE_SPREAD_01": { "scoring": { "multiplier": 1, "penalty_if_violated": 0 } },
        "RULE_EVEN_ODD_BALANCE_05": { "scoring": { "multiplier": 1, "penalty_if_violated": 0 } }
    };
    await fs.writeFile(WEIGHTS_PATH, JSON.stringify(baseWeights, null, 2));
  }
}

export default new Simulator();
