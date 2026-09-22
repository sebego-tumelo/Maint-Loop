---
type: concept
---

# Simulation Engine & Evolutionary Backtesting

The project is transitioning from a live-inference LLM prediction workflow to an autonomous, data-driven quantitative simulation framework. This allows the system to "backtest" strategies against historical draw data in a sandbox environment and optimize rule weights deterministically before applying them to production.

## 1. Directory Structure

The sandbox is fully isolated from `backend/` to prevent contamination of production data during high-speed iterations.

```text
simulation/
├── engine/
│   ├── DataGateway.js    # Interfaces with backend/utils.js to fetch production historical data
│   ├── Simulator.js      # Master Time Loop (Chronological replay 2019 -> Now)
│   ├── Backtester.js     # Evaluates candidate performance against historical draw outcomes
│   └── Optimizer.js      # Deterministic math for weight updates (Learning Rate)
├── config/
│   ├── rules.json        # Schema definition for rules
│   └── weights.json      # Current working weights (mutable parameter file)
├── agents/
│   └── Strategist.js     # Periodic LLM Reviewer (Macro-Loop strategy pivots)
└── results/              # Performance reports & evolution history logs
```

## 2. Data Source
Instead of maintaining a redundant local `data/` directory, the `DataGateway` module dynamically pulls historical draw results directly from the production MongoDB via `syncAndGetStats()` (shared with the backend). This ensures the simulator always operates on the most current truth.

The system utilizes a two-tier learning loop designed for speed and strategic alignment.

### A. The Micro-Loop (Per Draw)
Executed at high speed (thousands of iterations per minute).

1.  **Generate**: Candidate combinations are generated based on current `weights.json`.
2.  **Score**: Apply rules to candidates using weights from `weights.json`.
3.  **Filter**: Portfolio-selection sampling ensures strategic diversity.
4.  **Backtest**: Compare selections against the actual `winningNumbers` for the historical draw date.
5.  **Optimize (Learning)**: Apply the deterministic gradient:
    *   `NewWeight = OldWeight * (1 + (PerformanceFactor * LearningRate))`
6.  **Persist**: Update `weights.json` with the newly optimized parameters.

### B. The Macro-Loop (Periodic Check-in)
Executed every *N* iterations (e.g., 50–100 draws).

1.  **Pause**: Simulation pauses to aggregate performance statistics.
2.  **Summarize**: Metrics (ROI, Rule Success Rate, Gap Analysis) are compiled into a report.
3.  **Strategist (LLM)**: The report is sent to the LLM `Strategist` agent.
4.  **Pivot**: The LLM evaluates the high-level strategy and may output new Rule definitions (e.g., adding a "Wide Gap" rule) or suggest a paradigm shift in how the Optimizer behaves.
5.  **Resume**: Simulation continues with the refined strategy.

## 3. Implementation Guidelines for Future Regenerations

*   **Weights Management**: The `weights.json` file MUST strictly mirror the structure of rule objects in the database. 
*   **Feature Engineering**: New features (First Number, Gap Analysis, Rolling Mean) must be implemented as distinct rules in `rules.json`. The simulator will then automatically treat them as tunable weights.
*   **Performance Tracking**: The `Backtester` module must keep track of `times_satisfied` and `times_winning` to feed the `Optimizer`.
*   **TensorFlow Integration Plan**: Future iterations will replace the hardcoded "Micro-Loop" Optimizer with a trained Neural Network, but the current Deterministic-First approach is the mandatory baseline.
