---
type: concept
---

# Backend Server Module

`backend/server.js` serves as the primary backend orchestrator for the application, bridging the frontend, AI agent, and OKF Knowledge Base.

## Key Responsibilities

### 1. Agent Orchestration (`POST /run-instruction`)
- **Mode-Driven Execution**: Supports `MODE_A_ANALYZE` and `MODE_B_PREDICT` modes by dynamically injecting the appropriate system prompt and active rules from `/okf/rules.json`.
- **Agent Lifecycle**: Manages the agent's initialization using `pi-agent-core` with configured tools and the cloud-hosted `gemma4:31b` model.
- **Streaming Response**: Streams the agent's reasoning process via Server-Sent Events (SSE) to the frontend.
- **Knowledge Base Maintenance**: Automatically parses the agent's output for `okf_journal_draft`. If present, it persists entries to `/okf/journal.md` and triggers updates to rule weights in `/okf/rules.json`.

### 2. Lottery Data Service (`GET /api/stats`)
- Provides a summary of historical draw data (e.g., total records, latest result) fetched from the external lottery API.

### 3. Server Infrastructure
- Handles static file serving for the frontend SPA (`/frontend/dist`).
- Manages fallback routing for SPA client-side navigation.
- Configures database connectivity via Mongoose.
