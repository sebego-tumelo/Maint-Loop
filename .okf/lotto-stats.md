---
type: concept
---

# Lottery Statistics and Scraping

## Data Source
The lottery statistics (years processed, total record count, last scraped date) displayed in the `SettingsDialog` are fetched from the backend `/api/stats` endpoint.

## Scraping
Manual data updates can be triggered via the `SCRAPE` button in the `SettingsDialog`, which calls the `/api/scrape` backend endpoint. This fetches fresh results from the external API provider and updates the persisted metadata.

## Backend Integration
The backend handles both the initial statistical retrieval and the triggered scrape operations, ensuring the source of truth is consistent with the external data provider.
