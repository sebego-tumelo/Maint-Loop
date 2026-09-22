import mongoose from 'mongoose';

export const LottoMetadataSchema = new mongoose.Schema({
  lastUpdated: { type: Date, default: Date.now },
  totalRecords: Number,
  yearsProcessed: [Number],
  latestResult: {
    date: String,
    numbers: [Number]
  },
  analysis: {
    summary: String,
    lastAnalyzed: Date
  }
});

export const LottoMetadata = mongoose.model('LottoMetadata', LottoMetadataSchema);
