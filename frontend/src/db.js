import Dexie from 'dexie';

/**
 * @typedef {Object} ChatSession
 * @property {number} [id]
 * @property {string} title
 * @property {number} createdAt
 * @property {string} modelName
 * @property {string} serviceProvider
 * @property {string} systemPrompt
 */

/**
 * @typedef {Object} ChatMessage
 * @property {number} [id]
 * @property {number} sessionId
 * @property {'ai' | 'user'} sender
 * @property {string} text
 * @property {number} timestamp
 */

/**
 * @typedef {Object} GlobalModel
 * @property {string} [id]
 * @property {string} name
 * @property {number} isPinned
 */

/**
 * @typedef {Object} SecureConfig
 * @property {string} key
 * @property {string} value
 */

class LocalChatDatabase extends Dexie {
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
