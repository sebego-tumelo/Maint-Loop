---
type: concept
---

# Prediction Evaluation Process

The system automatically evaluates past predictions against actual lottery results.

## Workflow
1. **Identification**: Query MongoDB for predictions where `actual_outcome.evaluated` is `false`.
2. **Data Matching**: Match predictions with historical draw data using the `draw_date`.
3. **Metric Calculation**: Calculate `actual_sum`, count matching numbers, and identify rule performance.
4. **AI Synthesis**: Send the rationale and outcome to the AI agent to generate a qualitative `evaluation_summary` (part of `evaluation_metrics`).
5. **Persistence**: Update the Prediction document in MongoDB with the computed outcomes and the AI summary.
