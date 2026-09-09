---
type: concept
---

# Draw Result Merging (Transform on the Fly)

Instead of permanent migration, this project implements a "transform on the fly" strategy to merge data from Database A (external) and Database B (internal).

## Components
- `backend/scripts/cleanupMigratedRecords.js`: A utility to remove previously migrated records from Database B.
- `backend/services/lottoService.js`: Contains `getMergedDrawResults`, which fetches records from both databases, transforms source data, deduplicates, and merges them before serving to the client.
