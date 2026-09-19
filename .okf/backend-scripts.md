---
type: concept
---

# Backend Scripts

The backend contains utility scripts located in `backend/scripts/` to aid in development, auditing, and maintenance.

## `audit_candidate_pool.js`
This script audits the performance of the AI's candidate pool against actual draw results for a given date.

### Usage
```bash
# Audit for a specific date
node backend/scripts/audit_candidate_pool.js --date YYYY-MM-DD

# Audit the latest prediction
node backend/scripts/audit_candidate_pool.js --latest

# Audit the N most recent predictions
node backend/scripts/audit_candidate_pool.js --recent N
```
