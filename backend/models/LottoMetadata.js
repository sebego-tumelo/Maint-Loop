import mongoose from 'mongoose';

const lottoMetadataSchema = new mongoose.Schema({
  lastUpdated: { type: Date, default: Date.now },
  totalRecords: Number,
  latestResult: {
    date: String,
    numbers: [Number]
  }
});

export const LottoMetadata = mongoose.model('LottoMetadata', lottoMetadataSchema);
