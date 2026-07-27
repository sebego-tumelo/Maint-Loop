---
type: concept
---

# Database Schema

The application uses IndexedDB via `Dexie.js` for persistent client-side storage, and `MongoDB` for server-side persistence.

## Client-Side (IndexedDB)
Database: `MusmentorLocalDB`
- `sessions`: Chat session metadata.
- `messages`: Chat messages.
- `globalModels`: Available models.
- `secureConfig`: Configuration values.

## Server-Side (MongoDB)
- `LottoFeatures`: Stores the latest synthesized lottery analysis features to optimize AI performance and reduce API load.
    - `lastUpdated`: Date of last calculation.
    - `features`: Object containing hot/cold numbers, delta trends, etc.
