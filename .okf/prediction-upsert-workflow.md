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
        *   New unique sets are appended (``).
        *   Financials (total cost/profit) are updated based on the new total sets.
    *   If no record exists:
        *   A new document is created.
4.  **Frontend Sync**: The backend returns the updated full prediction object, which the frontend uses to sync state.
