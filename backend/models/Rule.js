import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  rule_id: { type: String, required: true, unique: true },
  category: String,
  description: String,
  empirical_metrics: {
    historical_occurrence_rate: Number,
    sample_size_draws: Number,
    confidence_level: String,
    theoretical_mean: Number
  },
  scoring: {
    weight_type: String,
    action_on_pass: String,
    action_on_fail: String,
    multiplier: Number,
    penalty_if_violated: Number,
    probability_factor: Number
  },
  last_journal_note: String
});

export const Rule = mongoose.model('Rule', ruleSchema);
