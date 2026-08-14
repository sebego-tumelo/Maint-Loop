import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema({
  draw_date: { type: String, required: true, unique: true }, // e.g., "2026-08-13"
  
  // AI Thoughts & Executive Rationale
  summary: { type: String, required: true }, // High-level summary of the decision process
  rationale_narrative: { type: String },     // Detailed strategic thought process
  
  // The 3 Selected Combination Draws
  predicted_sets: [
    {
      rank: { type: Number, required: true }, // 1, 2, or 3
      numbers: [{ type: Number, required: true }], // e.g. [4, 12, 19, 23, 31]
      expected_sum: { type: Number },
      parity: { type: String },
      set_rationale: { type: String } // Why this specific ticket set was picked
    }
  ],

  // Post-Draw Evaluation Outcome (Updated automatically after draw)
  actual_outcome: {
    winning_numbers: [{ type: Number }],
    actual_sum: { type: Number },
    evaluated: { type: Boolean, default: false },
    evaluated_at: { type: Date }
  },

  // Performance Scorecard
  evaluation_metrics: {
    best_match_count: { type: Number, default: 0 },
    matching_numbers: [{ type: Number }],
    successful_rules: [{ type: String }],
    failed_rules: [{ type: String }],
    evaluation_summary: { type: String } // Added field
  }
}, { timestamps: true });

export const Prediction = mongoose.model('Prediction', PredictionSchema);