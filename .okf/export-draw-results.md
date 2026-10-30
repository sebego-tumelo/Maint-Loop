---
type: concept
---

# Export Draw Results

This script exports all stored draw results from MongoDB into year-specific text files.

## Usage

```bash
node backend/scripts/export_draw_results.js
```

The exported files will be saved in the `/data` directory at the project root with the format:
`daily_lotto-past-draws-archive <YEAR>.txt`
