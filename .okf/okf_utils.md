---
type: concept
---

# OKF Utilities

`backend/okf_utils.js` serves as the centralized interface for the Open Knowledge Format (OKF) storage, responsible for mediating interaction between agent workflows and the `/okf/` directory.

## Responsibilities

1. **Rule Management**: Exports `getActiveRules()` to load heuristic rules (`/okf/rules.json`) and `updateRulesFile(ruleUpdates)` to handle weight mutations.
2. **Journaling**: Exports `appendToJournal(journalDraft)` to record agent activities and reasoning in `/okf/journal.md`.
3. **Configuration**: Defines `OKF_DIR` for consistent path resolution across the backend.

## Design
This module isolates knowledge base persistence logic, ensuring that workflow modules (`prediction_workflow.js`, `analysis_workflow.js`) do not need to implement raw filesystem I/O operations directly.
