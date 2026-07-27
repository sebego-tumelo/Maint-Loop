---
type: deployment
---

# Deployment Guide (Render)

This project is configured for unified deployment on [Render](https://render.com).

## Repository Setup
The project structure supports a single-service deployment where the backend server acts as the host for both the API and the static frontend files.

## Build & Start Configuration
In your Render Web Service dashboard, configure the following:

- **Build Command**: `npm run install-all && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `MONGODB_URI`: Your MongoDB connection string.
  - `OLLAMA_API_KEY`: API key for Ollama.
  - `OLLAMA_MODEL`: Default model (e.g., `gemma4:31b`).
  - `LOTTERY_API_BASE_URL`: URL of the scraping API service.

## Unified Deployment
- The root `package.json` manages dependency installation for both `frontend/` and `backend/`.
- The `backend/` server serves static files from `frontend/dist/`.
- All client-side requests are relative (e.g., `/chat-proxy` instead of `/.netlify/...`), resolving to the same origin.
