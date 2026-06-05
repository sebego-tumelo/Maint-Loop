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

// Stores globally discovered or selected models for the custom search component
export interface GlobalModel {
  id?: string; // e.g., 'gemma3:27b'
  name: string;
  isPinned: number; // 1 for pinned/previously selected, 0 for available
}

class LocalChatDatabase extends Dexie {
  sessions!: Table<ChatSession>;
  messages!: Table<ChatMessage>;
  globalModels!: Table<GlobalModel>;

  constructor() {
    super('MusmentorLocalDB');
    this.version(4).stores({
      sessions: '++id, createdAt',
      messages: '++id, sessionId, sender, timestamp',
      globalModels: 'id, isPinned'
    });
  }
}

export const db = new LocalChatDatabase();