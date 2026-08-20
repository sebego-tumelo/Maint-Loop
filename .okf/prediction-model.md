---
type: concept
---

# Prediction Data Model

The `Prediction` model (`backend/models/Prediction.js`) is a Mongoose schema designed to represent a single lottery prediction event.

## Structure

| Field | Type | Description |
| :--- | :--- | :--- |
| `draw_date` | `String` | Date for which the prediction is made ("YYYY-MM-DD"). |
| `summary` | `String` | High-level summary of the decision process. |
| `rationale_narrative` | `String` | Detailed strategic thought process. |
| `predicted_sets` | `Array<Object>` | Array of predicted combinations (rank, numbers, rationale). |
| `financials` | `Object` | Financial ledger (cost, payout, profit/loss, ROI). |
| `actual_outcome` | `Object` | Results after the draw occurs (winning numbers, status). |
| `evaluation_metrics` | `Object` | Performance scorecard (matches, rules triggered). |
| `timestamps` | `Date` | Auto-managed `createdAt` and `updatedAt`. |
