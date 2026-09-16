import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NEW_RULES = [
  {
    rule_id: "RULE_CONSECUTIVE_PAIRS_04",
    description: "Favor sets with at least one pair of consecutive numbers.",
    scoring: { multiplier: 1.3, penalty_if_violated: -0.2 }
  },
  {
    rule_id: "RULE_SUM_WINDOW_TIGHTENED_02",
    description: "Favor sets with sums between 71 and 110.",
    scoring: { multiplier: 1.5, penalty_if_violated: -0.3 }
  },
  {
    rule_id: "RULE_LOW_NUMBERS_07",
    description: "Favor sets with 2 or 3 numbers in the 1-18 range.",
    scoring: { multiplier: 1.4, penalty_if_violated: -0.3 }
  }
];

async function seedRules() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Rule = mongoose.connection.collection('rules');

    for (const rule of NEW_RULES) {
      await Rule.updateOne(
        { rule_id: rule.rule_id },
        { $set: rule },
        { upsert: true }
      );
      console.log(`✅ Rule ${rule.rule_id} seeded/updated.`);
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

seedRules();
