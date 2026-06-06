import Dexie, { type Table } from 'dexie';

export interface ChatSession {
  id?: number;
  title: string;
  createdAt: number;
  modelName: string;
  serviceProvider: string;
  systemPrompt: string;
}

export interface ChatMessage {
  id?: number;
  sessionId: number;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export interface GlobalModel {
  id?: string;
  name: string;
  isPinned: number;
}

// Key-value store schema for local configuration profiles and access tokens
export interface SecureConfig {
  key: string;  // e.g., 'hf_api_key', 'ollama_endpoint', 'ollama_api_key'
  value: string;
}

class LocalChatDatabase extends Dexie {
  sessions!: Table<ChatSession>;
  messages!: Table<ChatMessage>;
  globalModels!: Table<GlobalModel>;
  secureConfig!: Table<SecureConfig>;

  constructor() {
    super('MusmentorLocalDB');
    this.version(5).stores({
      sessions: '++id, createdAt',
      messages: '++id, sessionId, sender, timestamp',
      globalModels: 'id, isPinned',
      secureConfig: 'key' // Fast lookup via configuration property names
    });
  }
}

export const db = new LocalChatDatabase();