import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { JournalEntry } from '../models/JournalEntry.js';
import { Rule } from '../models/Rule.js';
import { RuleMetadata } from '../models/RuleMetadata.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OKF_DIR = path.join(__dirname, '../../.okf');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Migrate Rules
  const rulesRaw = await fs.readFile(path.join(OKF_DIR, 'rules.json'), 'utf-8');
  const rulesObj = JSON.parse(rulesRaw);

  await Rule.deleteMany({});
  await Rule.insertMany(rulesObj.rules);
  
  await RuleMetadata.deleteMany({});
  await RuleMetadata.create({
    ...rulesObj.system_info,
    last_updated: new Date(rulesObj.system_info.last_updated)
  });
  
  console.log('Rules migrated');

  // Migrate Journal
  // journal.md is unstructured, just appending lines.
  // This is tricky to migrate without structure.
  // I will skip migrating the existing content for now as it's just append-only text and difficult to parse into structured documents.
  // I'll log a warning.
  console.warn('Journal migration: Skipping existing journal.md content due to unstructured format. Only new entries will be stored in MongoDB.');

  await mongoose.disconnect();
  console.log('Migration completed');
}

migrate().catch(console.error);
