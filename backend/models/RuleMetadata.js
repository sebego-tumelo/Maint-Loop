import mongoose from 'mongoose';

const ruleMetadataSchema = new mongoose.Schema({
  lottery_format: String,
  dataset_range: String,
  last_updated: Date,
  total_active_rules: Number
});

export const RuleMetadata = mongoose.model('RuleMetadata', ruleMetadataSchema);
