import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema({
  draw_date: { type: String, required: true, unique: true }, // e.g. "2026-08-13"
  predicted_sets: [
    {
      rank: { type: Number, required: true }, // 1, 2, or 3
      numbers: [{ type: Number, required: true }], // e.g. [4, 12, 19, 23, 31]
      expected_sum: { type: Number },
      parity: { type: String }
    }
  ],
  actual_outcome: {
    winning_numbers: [{ type: Number }],
    actual_sum: { type: Number },
    evaluated: { type: Boolean, default: false },
    evaluated_at: { type: Date }
  },
  evaluation_metrics: {
    best_match_count: { type: Number, default: 0 },
    matching_numbers: [{ type: Number }],
    successful_rules: [{ type: String }],
    failed_rules: [{ type: String }]
  }
}, { timestamps: true });

export const Prediction = mongoose.model('Prediction', PredictionSchema);