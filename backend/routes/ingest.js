import express from 'express';
import { DrawResult } from '../models/DrawResult.js';

const router = express.Router();

// Middleware to protect this endpoint
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.MANUAL_INGEST_KEY) {
      return res.status(500).json({ error: 'Manual ingestion key not configured on server' });
  }
  if (apiKey !== process.env.MANUAL_INGEST_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/manual-ingest', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body; // The array from the POST response
    
    if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Invalid format: Expected "data" property to be an array' });
    }

    let savedCount = 0;
    for (const draw of data) {
      // Map the external JSON to your internal model structure
      const drawData = {
        gameId: draw.gameId,
        issue: draw.wagerIssue,
        drawTime: new Date(draw.drawTime),
        winNums: draw.winNumList,
        winPoolInfo: {
            nextJackpot: draw.nextJackpot,
            saleMoney: draw.saleMoney,
            jackpot: draw.jackpot,
            winPoolName: draw.winPoolName,
            winPoolId: draw.winPoolId
        },
        isLatestIssue: draw.isLatestIssue,
        rawResponse: draw
      };

      await DrawResult.findOneAndUpdate(
        { gameId: drawData.gameId, issue: drawData.issue },
        drawData,
        { upsert: true, new: true }
      );
      savedCount++;
    }

    console.log(`✅ Manually ingested ${savedCount} draw records.`);
    res.json({ message: `Successfully processed ${savedCount} records.` });
  } catch (error) {
    console.error('❌ Manual ingestion failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
