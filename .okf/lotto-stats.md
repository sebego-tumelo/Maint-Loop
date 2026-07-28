---
type: concept
---

# Lottery Statistics Display

## Data Source
The lottery statistics (years processed and total record count) displayed in the `SettingsDialog` are fetched from the backend `/api/lotto-stats` endpoint.

## Backend Integration
The backend endpoint fetches the data from the API server (as defined by `LOTTERY_API_BASE_URL`) to ensure the source of truth is consistent with the external data provider.
