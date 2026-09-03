import mongoose from 'mongoose';

const winLevelSchema = new mongoose.Schema({
  winCount: Number,
  winAmount: Number,
  winLevelName: String,
  winLevelId: Number,
  addWinAmount: Number,
  matches: String
});

const winNumSchema = new mongoose.Schema({
  winNum: String,
  winNumFlag: Number,
  numSn: String,
  drawSeq: String
});

const DrawResultSchema = new mongoose.Schema({
  gameId: { type: Number, required: true },
  issue: { type: Number, required: true },
  drawTime: { type: Date, required: true },
  winLevels: [winLevelSchema],
  winNums: [winNumSchema],
  winPoolInfo: {
    nextJackpot: Number,
    saleMoney: Number,
    salesIncome: Number,
    drawMachineId: String,
    rolloverAmount: Number,
    winPoolName: String,
    nextDrawTime: Date,
    winPoolId: Number
  },
  isLatestIssue: Boolean,
  rawResponse: Object // Store the whole response for future-proofing
}, { timestamps: true });

// Ensure unique issue per game
DrawResultSchema.index({ gameId: 1, issue: 1 }, { unique: true });

export const DrawResult = mongoose.model('DrawResult', DrawResultSchema);
