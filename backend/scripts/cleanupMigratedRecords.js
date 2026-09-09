import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DrawResult } from '../models/DrawResult.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- CONFIGURATION ---
const DRY_RUN = true; // Set to false to perform actual deletion
// ----------------------

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Target records migrated in the previous step (issue <= 2730).
    // You may want to add further criteria if necessary.
    const query = { issue: { $lte: 2730 } };
    
    if (DRY_RUN) {
      const count = await DrawResult.countDocuments(query);
      console.log(`[DRY RUN] Would have deleted ${count} migrated records.`);
      console.log(`Set DRY_RUN = false to perform actual deletion.`);
    } else {
      const result = await DrawResult.deleteMany(query);
      console.log(`Deleted ${result.deletedCount} migrated records.`);
    }
    
    process.exit();
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
