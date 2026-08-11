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
- `LottoMetadata`: Stores high-level summary metadata for the lottery dataset.
    - `lastUpdated`: Date of last scrape/update.
    - `totalRecords`: Count of all records.
    - `yearsProcessed`: Array of years covered in the dataset.
    - `latestResult`: Object containing the most recent draw date and numbers.
    - `analysis`: Object containing AI-generated summary and timestamp.
