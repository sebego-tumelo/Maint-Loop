---
type: concept
---

# Ingest Draw Result

This script ingests a lottery draw result in JSON format, persists it to MongoDB, and triggers a re-export of all draws into year-specific text files.

## Usage

1. Place the draw result JSON data into `backend/scripts/input.json`.
2. Run the script:
   ```bash
   node backend/scripts/ingest_draw_result.js
   ```

The script will:
1. Persist the draw to MongoDB (upserting if it already exists).
2. Trigger the `exportResults` function to update the flat files in `/data`.
