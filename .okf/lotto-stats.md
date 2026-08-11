---
type: concept
---

# Lottery Statistics and Scraping

## Data Source
The lottery statistics (years processed, total record count, last scraped date, and AI-driven analysis summary) displayed in the application are fetched from the backend `/api/stats` endpoint.

## Scraping
Manual data updates can be triggered via the `SCRAPE` button in the `SettingsDialog`. This initiates an asynchronous scrape process via the external API (configured via `VITE_LOTTERY_API_BASE_URL`), returns a `jobId`, and the application then polls the `/api/status/:jobId` endpoint every 5 seconds until completion, finally refreshing the local statistics from the backend `/api/stats` endpoint.

## Backend Integration
The backend handles both the initial statistical retrieval and the triggered scrape operations, ensuring the source of truth is consistent with the external data provider.
