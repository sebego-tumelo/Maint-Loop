---
type: concept
---

# External Lottery API Data Flow

## Overview
The application relies on an external API provider to retrieve historical lottery draw results. This architecture allows the app to remain lightweight while offloading the heavy lifting of data scraping and maintenance.

## Data Flow
1.  **Request Initiation**: The `prediction_workflow.js` engine (invoked by the Pi Agent) requests statistics by calling `getOrUpdateLottoFeatures()`.
2.  **API Integration**: 
    - The engine first checks for new updates via `GET /api/newupdate`.
    - If updates are required or cache is missing, it fetches raw historical data from `GET /api/results`.
3.  **Data Processing**: The raw data (expected in JSON format) is processed by `calculateFeaturesFromData` to compute strategic metrics.
4.  **Backend Proxy**: The `backend/server.js` acts as a coordinator, managing the `MONGODB_URI` for caching and proxying communication with the external `LOTTERY_API_BASE_URL`.

## API Requirements
To function correctly, the external API server MUST implement the endpoints defined in `.okf/api-interaction.md`, specifically returning JSON payloads for `/api/results` and `/api/newupdate`.
