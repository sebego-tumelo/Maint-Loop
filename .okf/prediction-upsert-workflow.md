---
type: concept
---
# Prediction Upsert Workflow

To prevent "duplicate key" errors in MongoDB when multiple prediction requests are made on the same day, the backend implements an **upsert** strategy.

## Workflow

1.  **Request**: Frontend calls `POST /api/predict-draw`.
2.  **Backend**: `runPrediction()` triggers `persistPrediction()`.
3.  **Persistence**:
    *   `persistPrediction` finds an existing record for the current `draw_date` (`YYYY-MM-DD`).
    *   If a record exists:
        *   New sets are filtered for uniqueness against existing sets.
        *   If the total count (existing + new unique) is less than the requested `boardCount`, additional unique sets are pulled from the `top20` candidates to fill the gap.
        *   New unique sets (and fillers) are appended.
        *   Financials (total cost/profit) are updated based on the final total sets.
    *   If no record exists:
        *   A new document is created, ensuring the set count meets the `boardCount` by filling with `top20` candidates if necessary.
4.  **Frontend Sync**: The backend returns the updated full prediction object, which the frontend uses to sync state.
