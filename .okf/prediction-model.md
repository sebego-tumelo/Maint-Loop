---
type: concept
---

# Prediction Data Model

The `Prediction` model (`backend/models/Prediction.js`) is a Mongoose schema designed to represent a single lottery prediction event.

## Structure
- `draw_date`: The specific date for which the prediction is made.
- `predicted_sets`: An array of objects, each representing a set of numbers generated for the prediction, including:
  - `rank`: Priority of the set (e.g., 1, 2, or 3).
  - `numbers`: The actual lottery numbers.
  - `expected_sum`: Mathematical property of the set.
  - `parity`: Parity distribution of the numbers.
- `actual_outcome`: Stores the results after the draw occurs (winning numbers, actual sum).
- `evaluation_metrics`: Stores performance metrics comparing the prediction to the `actual_outcome`.
- `financials`: Tracks financial performance of the prediction (cost, payout, profit/loss, ROI).
