import Dexie, { type Table } from 'dexie';

export interface ChatSession {
  id?: number;
  title: string;
  createdAt: number;
}

export interface ChatMessage {
  id?: number;
  sessionId: number; // Links the message to a specific conversation session
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

class LocalChatDatabase extends Dexie {
  sessions!: Table<ChatSession>;
  messages!: Table<ChatMessage>;

  constructor() {
    super('MusmentorLocalDB');
    this.version(2).stores({
      sessions: '++id, createdAt',
      messages: '++id, sessionId, sender, timestamp'
    });
  }
}

export const db = new LocalChatDatabase();