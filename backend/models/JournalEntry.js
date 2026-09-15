import mongoose from 'mongoose';

const journalEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  entry_type: { type: String, default: 'AGENT_ENTRY' },
  summary: { type: String, required: true },
  learned_lesson: { type: String },
  draw_date: { type: String }, // NEW
  best_pool_match: { type: Object } // NEW
});

export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
