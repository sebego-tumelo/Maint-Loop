import mongoose from 'mongoose';

const ResultsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  numbers: [{ type: Number, required: true }],
}, { timestamps: true });

export const Results = mongoose.model('Results', ResultsSchema);
