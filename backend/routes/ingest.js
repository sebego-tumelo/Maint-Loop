import express from 'express';
import { runAnalysis } from '../analysis_workflow.js';
import { DrawResult } from '../models/DrawResult.js';

const router = express.Router();

// Middleware to protect this endpoint
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.MANUAL_INGEST_KEY) {
      return res.status(500).json({ error: 'Manual ingestion key not configured on server' });
  }
  if (apiKey !== process.env.MANUAL_INGEST_KEY) {
    console.warn('⚠️ Unauthorized ingestion attempt detected.');
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/manual-ingest', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    console.log(`📥 Received ingestion request for single record.`);
    
    if (!data || !data.winNotice) {
        return res.status(400).json({ error: 'Invalid format: Expected "data" property with "winNotice"' });
    }

    const { winNotice, winPoolInfoVo, isLatestIssue } = data;

    const drawData = {
      gameId: winNotice.gameId,
      issue: winNotice.issue,
      drawTime: new Date(winNotice.drawTime),
      winLevels: winNotice.winLevels,
      winNums: winNotice.winNums,
      winPoolInfo: {
        nextJackpot: winPoolInfoVo.nextJackpot,
        saleMoney: winPoolInfoVo.saleMoney,
        salesIncome: winPoolInfoVo.salesIncome,
        drawMachineId: winPoolInfoVo.drawMachineId,
        rolloverAmount: winPoolInfoVo.rolloverAmount,
        winPoolName: winPoolInfoVo.winPoolName,
        nextDrawTime: new Date(winPoolInfoVo.nextDrawTime),
        winPoolId: winPoolInfoVo.winPoolId
      },
      isLatestIssue: isLatestIssue,
      rawResponse: data
    };

    const result = await DrawResult.findOneAndUpdate(
      { gameId: drawData.gameId, issue: drawData.issue },
      drawData,
      { upsert: true, new: true }
    );

    console.log(`✅ Successfully upserted Draw Issue: ${drawData.issue}. (DB ID: ${result._id})`);
    
    // Trigger Analysis after ingestion
    runAnalysis()
      .then(() => console.log('✅ Automated analysis after ingestion completed.'))
      .catch(err => console.error('❌ Automated analysis after ingestion failed:', err));

    res.json({ message: `Successfully processed draw ${drawData.issue} and triggered analysis.` });
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
