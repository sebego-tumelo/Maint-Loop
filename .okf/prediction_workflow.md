---
type: concept
---

# Prediction Workflow Module

`backend/prediction_workflow.js` orchestrates the lottery analysis and prediction lifecycle, acting as the interface between the agent and the OKF Knowledge Base.

## Responsibilities

1. **System Instruction Management**: Defines the LLM agent behavior for MODE A (Data Analysis) and MODE B (Prediction Synthesis).
2. **Knowledge Base Interaction**: Provides utility functions to read/update `rules.json` and append to `journal.md`.
3. **Tool Exposure**: Exports functions (`fetch_raw_results`, `generate_candidate_predictions`) that allow the agent to perform data fetching and candidate scoring/filtering.

## Integration

- **Rules (`/okf/rules.json`)**: Loads active scoring heuristics and handles weight adjustments (boosting/penalizing) based on agent analysis.
- **Journal (`/okf/journal.md`)**: Records agent activity, analysis summaries, and rule change justifications.
- **Candidate Generator (`/backend/candidateGenerator.js`)**: Invoked by the workflow to generate and score combinations.
