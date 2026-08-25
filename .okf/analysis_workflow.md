---
type: concept
---

# Analysis Workflow Module

`backend/analysis_workflow.js` orchestrates the autonomous AI-driven background analysis of lottery datasets (MODE A).

## Responsibilities

1. **System Instruction Management**: Defines the `analysisSystemInstruction` for the data analysis agent.
2. **Analysis Pipeline**:
   - Fetches statistical data.
   - Sets up the AI agent with specific heuristics.
   - Subscribes to agent messages to track and handle analysis completion.
3. **Financial Evaluation**: 
   - Provides `evaluatePredictionFinancials(drawDate)` to calculate and update ROI and profit/loss metrics based on `DrawResult` and `Prediction` data.
4. **Integration**:
   - Uses `backend/okf_utils.js` to persist analysis findings and rule mutations to the Knowledge Base.
   - Updates `LottoMetadata` in the database to reflect the latest analysis state.

## Pipeline Execution Workflow (`runAnalysis`)

The `runAnalysis` function follows these steps asynchronously:

1. **Data Retrieval**: Fetches current statistical data (`syncAndGetStats()`) and the active configuration rules (`getActiveRules()`).

2. **Prediction Evaluation**: 
   - Identifies unevaluated predictions in the database.
   - Fetches actual draw results, calculates performance metrics, and generates a strategic evaluation summary using an AI agent.
   - Updates the `Prediction` model with these outcomes.

3. **Dataset Analysis & Rule Discovery**:
   - Initializes the AI agent (`gemma4:31b`) with the `analysisSystemInstruction` and current rules.
   - Supplies a subset of historical data (last 100 draws) for analysis.
   - Agent produces a JSON response containing an `okf_journal_draft` with a summary and proposed rule mutations.

4. **Persistence & Knowledge Update**:
   - Validates the agent's JSON output.
   - Appends findings to `okf/journal.md`.
   - Updates rule weights in `okf/rules.json`.
   - Updates `LottoMetadata` in the database with the analysis status.
