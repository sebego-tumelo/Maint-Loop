// Simulator.js: Master Time Loop (Chronological replay)
import { DataGateway } from './DataGateway.js';
import { Backtester } from './Backtester.js';
import { Optimizer } from './Optimizer.js';
import Strategist from '../agents/Strategist.js';

class Simulator {
  /**
   * @param {Object} config - Simulation configuration
   */
  async runSimulation(config) {
    console.log("Starting simulation...");
    
    // 1. Initialization
    const historicalDraws = await DataGateway.getHistoricalDraws();
    
    // 2. Master Loop
    for (let i = 0; i < historicalDraws.length; i++) {
      const draw = historicalDraws[i];
      
      // 3. Integration
      // TODO: Generate candidates based on current config/rules
      const candidates = []; 
      
      const performance = Backtester.evaluate(candidates, draw);
      await Optimizer.updateWeights(performance);

      // 4. Macro-Loop Control
      if (i > 0 && i % 50 === 0) {
        console.log(`Simulator: Macro-Loop check-in at iteration ${i}`);
        await Strategist.reviewPerformance({ iteration: i, performance });
      }
    }
    
    console.log("Simulation complete.");
  }
}

export default new Simulator();
