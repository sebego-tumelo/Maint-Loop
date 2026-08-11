import mongoose from 'mongoose';

const lottoMetadataSchema = new mongoose.Schema({
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

export const LottoMetadata = mongoose.model('LottoMetadata', lottoMetadataSchema);
