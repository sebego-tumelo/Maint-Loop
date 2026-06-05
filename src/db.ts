import Dexie, { type Table } from 'dexie';

export interface ChatSession {
  id?: number;
  title: string;
  createdAt: number;
  modelName: string;         // Stored per conversation thread
  serviceProvider: string;   // Stored per conversation thread
  systemPrompt: string;      // Stored per conversation thread
}

export interface ChatMessage {
  id?: number;
  sessionId: number;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

class LocalChatDatabase extends Dexie {
  sessions!: Table<ChatSession>;
  messages!: Table<ChatMessage>;

  constructor() {
    super('MusmentorLocalDB');
    this.version(3).stores({
      sessions: '++id, createdAt',
      messages: '++id, sessionId, sender, timestamp'
    });
  }
}

export const db = new LocalChatDatabase();