---
type: concept
---

# Draw Result Migration

This project includes a migration script located at `backend/scripts/migrateDrawResults.js` to transfer historical draw result records from Database A (external) to Database B (internal/target).

## Key Characteristics
- **Source**: Database A (`drawresults` collection).
- **Target**: Internal `DrawResult` model.
- **Idempotency**: Uses `updateOne` with `upsert: true` to prevent duplicates.
- **Data Transformation**: Maps source record structures (e.g., `winningNumbers` -> `winNums`, `prizeDivisions` -> `winLevels`) to the target schema.
- **Issue Generation**: Automatically calculates `issue` numbers in reverse-chronological order based on a starting point (`2731`).
