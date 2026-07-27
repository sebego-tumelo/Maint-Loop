---
type: concept
---

# Architecture

This project is a Vue 3-based single-page application (SPA) focused on local AI chat capabilities.

## Stack
- **Framework**: Vue 3 with Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB (via Dexie.js)
- **AI Integrations**: `@huggingface/inference` and `ollama`

## Main Entry Points
- `frontend/src/main.js`: Initializes the Vue application.

## Service Interactions
AI services are handled in `frontend/src/services/`.
- `ollamaService.js`: Interface for local Ollama instances.
- `huggingFaceService.js`: Interface for Hugging Face APIs.
- `aiProviderService.js`: Abstraction/dispatcher for AI providers.

## Data Flow
User interactions in `ChatView.vue` trigger actions in the service layer, which communicates with the chosen AI provider and persists data in Dexie.js (see database-schema.md).
