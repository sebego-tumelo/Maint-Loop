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
  - `200 OK`: `{ "success": true, "count": number, "data": Array<DrawResult> }`
  - `500 Internal Server Error`: `{ "success": false, "error": string }`

#### Data Schema (`DrawResult`)
The `DrawResult` model stores the parsed lottery data. See [Database Migrations](./database-migrations.md) for details on date formatting policies.

### Fields

| Field | Type | Constraints/Default | Description |
| :--- | :--- | :--- | :--- |
| `drawDate` | `String` | Required, Unique | Unique date identifier (Format: "YYYY-MM-DD"). |
| `secondaryDrawDate` | `String` | - | Original human-readable format (Format: "Weekday DD Mon YYYY"). |
| `winningNumbers` | `Array<Number>` | Default: `[]` | Parsed integer array of winning numbers. |
| `prizeDivisions` | `Array<Object>` | - | Payout details including `division`, `matches`, `winners`, `prize.amount`, `prize.currency`. |
| `updatedAt` | `Date` | Default: `Date.now` | Timestamp of the last record update. |


The `prizeDivisions` field is an array of objects structured as follows:

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `division` | `String` | - | The division name (e.g., "Division 1"). |
| `matches` | `String` | - | The number of matches (e.g., "6"). |
| `winners` | `Number` | - | The number of winners for this division. |
| `prize.amount` | `Number` | - | The prize amount. |
| `prize.currency` | `String` | 'ZAR' | The currency of the prize amount. |

(Note: `_id` is disabled for prize division objects).


### 1.5 Get Latest Results
Retrieves a specified number of the latest lotto draw results.

- **Method**: `GET`
- **Path**: `/api/latest-results?limit=N`
- **Parameters**:
  - `limit`: (Optional, default: 20) Number of results to return.
- **Response**:
  - `200 OK`: `{ "success": true, "count": number, "data": Array<DrawResult> }`
  - `500 Internal Server Error`: `{ "success": false, "error": string }`

### 2. Trigger Scrape
Initiates an asynchronous scrape process in the background.

- **Method**: `POST`
- **Path**: `/api/scrape`
- **Response**:
  - `202 Accepted`: `{ "success": true, "jobId": string, "message": string }`

### 3. Upload File for AI Extraction
Uploads a file for text-based AI extraction. The process is asynchronous.

- **Method**: `POST`
- **Path**: `/api/upload`
- **Content-Type**: `multipart/form-data`
- **Form Data Field**: `lottoFile`
- **Response**:
  - `202 Accepted`: `{ "success": true, "jobId": string, "message": string }`
  - `400 Bad Request`: `{ "success": false, "error": string }` (if no file)

### 4. Check Job Status
Checks the status of a specific job (either scrape or AI extraction).

- **Method**: `GET`
- **Path**: `/api/status/:jobId`
- **Response**:
  - `200 OK`: `{ "success": true, "status": string, "type": "scrape" | "ai", "count"?: number, "error"?: string }`
  - `404 Not Found`: `{ "success": false, "message": string }`

### 5. Check for New Updates
Checks if there are any new updates (new records added).

- **Method**: `GET`
- **Path**: `/api/newupdate`
- **Response**:
  - `200 OK`: `{ "success": true, "hasNewUpdate": boolean, "message": string }`

## Notes
- All POST endpoints (`/api/scrape`, `/api/upload`) run processes in the background to avoid blocking the response.
- Use the `jobId` returned from these endpoints to poll for status using `/api/status/:jobId`.
