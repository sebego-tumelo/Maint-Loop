---
type: documentation
title: Manual Lottery Data Ingestion
---

# Manual Lottery Data Ingestion

To keep the application data current without violating Terms of Service by scraping, we now use a manual ingestion workflow.

## Process

1.  **Retrieve Data**: Open the National Lottery website in your browser and navigate to the results page.
2.  **Locate Data**: Open Developer Tools -> Network tab.
3.  **Find Request**: Find the POST request to `/api/engine/draw/getIssueDrawResultDetail` (or similar).
4.  **Copy Response**: Copy the JSON response body.
5.  **Submit to App**: Send a POST request to your backend:
    *   **Endpoint**: `POST /api/manual-ingest`
    *   **Headers**: 
        *   `Content-Type: application/json`
        *   `x-api-key: <YOUR_SECRET_KEY>`
    *   **Body**: Paste the entire JSON response body (Ensure it contains the `data` wrapper).

## Configuration
Ensure `MANUAL_INGEST_KEY` is set in your `.env` file on both development and production servers.
