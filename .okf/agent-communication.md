---
type: concept
---

# Agent Communication Schema

`LotteryAgentStepResponse.json` defines the structure of the agent's decision-making output after a step. It provides a standardized format for the agent to report its progress, suggest updates to the rules, and make final predictions.

## Schema Components

- `step`: The current step number in the execution chain.
- `status`: Signals whether to run tools, update rules, or finalize the prediction.
- `okf_journal_draft`: Contains the thought process, rule mutation suggestions, and anomaly logs.
- `tool_calls`: An array of deterministic calculations requested from Node.js.
- `next_prompt_payload`: Instructions for the next step.
- `final_prediction`: Populated only when the status is `COMPLETE`.

## Usage
The system processes the `okf_journal_draft.rule_updates` to dynamically adjust `rules.json`, allowing the agent to continuously refine its strategy based on its observations.
