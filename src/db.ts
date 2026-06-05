import Dexie, { type Table } from 'dexie';

export interface ChatMessage {
  id?: number;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

class LocalChatDatabase extends Dexie {
  messages!: Table<ChatMessage>;

  constructor() {
    super('MusmentorLocalDB');
    this.version(1).stores({
      messages: '++id, sender, timestamp'
    });
  }
}

export const db = new LocalChatDatabase();