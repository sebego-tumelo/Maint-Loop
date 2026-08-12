---
type: concept
---

# Prediction Workflow Module

`backend/prediction_workflow.js` orchestrates the lottery prediction lifecycle (MODE B). It encapsulates the agent-driven candidate selection and synthesis, utilizing `backend/candidateGenerator.js` for mathematical scoring based on rules defined in `/okf/rules.json`.

## Responsibilities

1. **System Instruction Management**: Defines the LLM agent behavior for MODE B (Prediction Synthesis).
2. **Orchestration**: Exports `runPrediction()` which manages the end-to-end flow:
    - Data Preparation (loading rules and historical draw data).
    - Candidate Generation and Scoring (using `candidateGenerator.js`).
    - AI Agent Synthesis (selecting top candidates based on contextual rules).
    - Journaling and Result Return.

## Integration

- **Knowledge Base (`/okf/`)**: Uses `backend/okf_utils.js` to read/update `rules.json` and append to `journal.md`.
- **Candidate Generator (`/backend/candidateGenerator.js`)**: Invoked by the workflow to generate and score combinations.
