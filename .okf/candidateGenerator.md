---
type: concept
---

# Candidate Generator Utility

`candidateGenerator.js` is a utility module responsible for generating, validating, and scoring unique lottery-style number combinations.

## Functions

### `loadHistoricalDrawSets()`
Fetches existing lottery draw results from `/api/results` and builds a `Set` for efficient O(1) uniqueness checks against historical data.

### `generateUniqueCandidates(count = 1000)`
Generates `count` random 5-number sequences (1-36). It ensures candidates are unique both against the historical dataset and against other candidates generated in the current session.

### `scoreAndFilterCandidates(candidates, rulesFilePath)`
Ranks candidates based on heuristics defined in `rules.json`. It evaluates combinations against rules such as:
- **Decade Spread**: Checking distribution across number ranges.
- **Sum Window**: Validating if the sum falls within a specific range.
- **Even/Odd Balance**: Checking the parity ratio.

It returns the top 20 candidates based on a composite score calculated from these rules.
