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
3. **Integration**:
   - Uses `backend/okf_utils.js` to persist analysis findings and rule mutations to the Knowledge Base.
   - Updates `LottoMetadata` in the database to reflect the latest analysis state.
