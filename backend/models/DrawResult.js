import mongoose from 'mongoose';

const prizeDivisionSchema = new mongoose.Schema({
  division: String,
  matches: String,
  winners: Number,
  prize: {
    amount: Number,
    currency: { type: String, default: 'ZAR' }
  }
}, { _id: false });

const drawResultSchema = new mongoose.Schema({
  drawDate: { type: String, required: true, unique: true }, // Format: "YYYY-MM-DD"
  secondaryDrawDate: { type: String },                    // Original format
  winningNumbers: { type: [Number], default: [] },          // Array of integers
  prizeDivisions: [prizeDivisionSchema],
  updatedAt: { type: Date, default: Date.now }
});

export const DrawResult = mongoose.model('DrawResult', drawResultSchema);
