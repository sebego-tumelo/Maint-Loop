---
type: API
---

# API Interaction Guide (node_web_scraping)

This document defines the interface for interacting with the `node_web_scraping` API.

## Base URL
The API is served at `/api`.

## Endpoints

### 1. Get All Results
Retrieves all scraped lotto results from the database.

- **Method**: `GET`
- **Path**: `/api/results`
- **Response**:
  - `200 OK`: `{ "success": true, "count": number, "data": Array<Object> }`
  - `500 Internal Server Error`: `{ "success": false, "error": string }`

### 2. Trigger Scrape
Initiates an asynchronous scrape process in the background.

- **Method**: `POST`
- **Path**: `/api/scrape`
- **Response**:
  - `200 OK`: `{ "success": true, "message": string }`

### 3. Upload File for AI Extraction
Uploads a file for text-based AI extraction. The process is asynchronous.

- **Method**: `POST`
- **Path**: `/api/upload`
- **Content-Type**: `multipart/form-data`
- **Form Data Field**: `lottoFile`
- **Response**:
  - `202 Accepted`: `{ "success": true, "jobId": string, "message": string }`
  - `400 Bad Request`: `{ "success": false, "error": string }` (if no file)

### 4. Check Extraction Status
Checks the status of a specific AI extraction job.

- **Method**: `GET`
- **Path**: `/api/upload/status/:jobId`
- **Response**:
  - `200 OK`: `{ "success": true, "status": string, "count"?: number, "error"?: string }`
  - `404 Not Found`: `{ "success": false, "message": string }`

## Notes
- All POST endpoints (`/api/scrape`, `/api/upload`) run processes in the background to avoid blocking the response.
- Use the `jobId` returned from `/api/upload` to poll for completion using `/api/upload/status/:jobId`.
