---
type: concept
---

# Database Schema

The application uses IndexedDB via `Dexie.js` for persistent client-side storage. The database name is `MusmentorLocalDB`.

## Tables

### `sessions`
Stores chat session metadata.
- `id` (primary key, auto-increment)
- `createdAt` (number, index)
- `title` (string)
- `modelName` (string)
- `serviceProvider` (string)
- `systemPrompt` (string)

### `messages`
Stores chat messages for sessions.
- `id` (primary key, auto-increment)
- `sessionId` (number, index)
- `sender` (string, 'ai' | 'user', index)
- `text` (string)
- `timestamp` (number, index)

### `globalModels`
Stores available models for configuration.
- `id` (primary key)
- `name` (string)
- `isPinned` (number)

### `secureConfig`
Stores configuration values.
- `key` (primary key)
- `value` (string)
