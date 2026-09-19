import mongoose from 'mongoose';

const rulePerformanceSchema = new mongoose.Schema({
  rule_id: { type: String, required: true },
  draw_date: { type: Date, required: true },
  times_satisfied: { type: Number, default: 0 },
  times_part_of_winning_set: { type: Number, default: 0 },
  success_rate: { type: Number, default: 0 } // (times_part_of_winning_set / times_satisfied)
});

export const RulePerformance = mongoose.model('RulePerformance', rulePerformanceSchema);
