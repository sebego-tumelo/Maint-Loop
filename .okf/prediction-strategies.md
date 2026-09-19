---
type: concept
title: Prediction Strategy Library
---

# Prediction Strategy Library

The system now supports multiple, switchable candidate selection strategies. This allows for comparative analysis of different statistical models and helps mitigate the risk of a single strategy failing during specific lottery "regime shifts."

## Available Strategies

Strategies are defined by their scoring algorithm and tie-breaking methodology in `backend/candidateGenerator.js`.

### 1. `MULTIPLICATIVE_DEFAULT` (Original)
- **Scoring**: Multiplicative multipliers (e.g., `compositeScore *= 1.3`).
- **Characteristics**: Tends to cluster scores tightly, leading to potential tie-breaking issues.
- **AI Role**: High reliance on AI intuition due to low score variance among top candidates.

### 2. `ADDITIVE_JITTER` (Current/Default)
- **Scoring**: Additive weights (e.g., `compositeScore += 1.0`).
- **Tie-Breaking**: Incorporates `Math.random() * 0.001` (jitter) to ensure unique scores for all candidates.
- **Characteristics**: Creates a clear statistical hierarchy; forces a distinct ranking.
- **AI Role**: AI acts as a portfolio manager, leveraging clear score differences to diversify selections across rule patterns.

## Implementation Details

### Scoring Engine Logic
Strategies are applied in `scoreAndFilterCandidates` within `backend/candidateGenerator.js`.
- **Additive vs. Multiplicative**: Additive scoring prevents mathematical clustering and ensures that satisfying different rule combinations results in distinct, actionable score differences.
- **Jittering**: The addition of a negligible random fraction (`jitter`) ensures that no two candidates are mathematically identical, providing the AI with a strict ranking.

### Contextual Synthesis
The AI is instructed to treat `composite_score` as a high-precision statistical anchor, prioritizing candidates with higher scores while maintaining portfolio diversity by checking the `satisfied_rules` metric.

### 3. Dynamic Strategy Modifiers (UI-selectable)
These strategies do not replace the core scoring mechanism but instead adjust the rule-based weights before candidate evaluation in `backend/prediction_workflow.js`.

- **`hot`**:
  - **Effect**: Increases the scoring multiplier for `RULE_LOW_NUMBERS_07` by 1.5x.
  - **Goal**: Prioritizes combinations containing lower-range numbers, assuming they are currently "hot."
- **`frequency`**:
  - **Effect**: Doubles the penalty for violating `RULE_DECADE_SPREAD_01`.
  - **Goal**: Forces the selection engine to strictly adhere to balanced decade distributions, prioritizing combinations that satisfy this rule over those that don't.

