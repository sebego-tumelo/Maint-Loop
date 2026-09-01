import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { JournalEntry } from '../models/JournalEntry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
const OKF_DIR = path.join(__dirname, '../../.okf');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const journalRaw = await fs.readFile(path.join(OKF_DIR, 'journal.md'), 'utf-8');
  
  // Regex to match: ### [YYYY-MM-DD] - TYPE \n **Summary:** Content
  const entryRegex = /### \[(\d{4}-\d{2}-\d{2})\] - ([\w_]+)\n\*\*Summary:\*\*\s*(.*)/g;
  
  let match;
  let count = 0;
  while ((match = entryRegex.exec(journalRaw)) !== null) {
    const [_, dateStr, type, summary] = match;
    
    await JournalEntry.create({
      date: new Date(dateStr),
      entry_type: type,
      summary: summary.trim()
    });
    console.log(`✅ Migrated entry: ${dateStr} - ${type}`);
    count++;
  }
  
  console.log(`Migration completed. ${count} entries migrated.`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
