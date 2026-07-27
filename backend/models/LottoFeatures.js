import mongoose from 'mongoose';

const lottoFeaturesSchema = new mongoose.Schema({
  lastUpdated: { type: Date, default: Date.now },
  features: { type: Object, required: true }
});

export const LottoFeatures = mongoose.model('LottoFeatures', lottoFeaturesSchema);
