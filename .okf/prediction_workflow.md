---
type: concept
---

# Prediction Workflow Module

`backend/prediction_workflow.js` orchestrates the lottery prediction lifecycle (MODE B). `backend/analysis_workflow.js` provides an autonomous AI-driven pipeline for data analysis and rule discovery (MODE A). `backend/okf_utils.js` acts as the interface between the agents and the OKF Knowledge Base.

## Responsibilities

1. **System Instruction Management**: Defines the LLM agent behavior for MODE B (Prediction Synthesis).
2. **Tool Exposure**: Exports functions (`fetch_raw_results`, `generate_candidate_predictions`) that allow the agent to perform data fetching and candidate scoring/filtering.
3. **Agent Response Validation**: Uses `backend/validator.js` to ensure agent outputs conform to the structural contract defined in `/backend/models/agent-schema.json`.

## Integration

- **Knowledge Base (`/okf/`)**: Uses `backend/okf_utils.js` to read/update `rules.json` and append to `journal.md`.
- **Candidate Generator (`/backend/candidateGenerator.js`)**: Invoked by the workflow to generate and score combinations.
- **Schema (`/backend/models/agent-schema.json`)**: Defines the expected JSON structure for agent responses. The agents are strictly instructed to output pure JSON, and the pipelines implement robust parsing to handle potential markdown wrappers.
