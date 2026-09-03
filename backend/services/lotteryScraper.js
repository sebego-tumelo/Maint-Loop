import { createClient } from 'tls-client';
import { DrawResult } from '../models/DrawResult.js';

export const fetchAndSaveLatestDraw = async () => {
  console.log('🔍 Starting internal lottery scrape...');
  
  const client = createClient({
    clientIdentifier: 'chrome_120',
    ja3String: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-21,29-23-24,0',
  });

  try {
    const response = await client.post('https://www.nationallottery.co.za/api/engine/draw/getIssueDrawResultDetail', {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json;charset=UTF-8',
        'origin': 'https://www.nationallottery.co.za',
        'referer': 'https://www.nationallottery.co.za/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ gameId: 11001 }),
    });

    const result = JSON.parse(response.body);
    if (!result.r || !result.data) {
      throw new Error('Invalid response format from API');
    }

    const { winNotice, winPoolInfoVo, isLatestIssue } = result.data;

    // Upsert the data
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
      isLatestIssue,
      rawResponse: result.data
    };

    await DrawResult.findOneAndUpdate(
      { gameId: drawData.gameId, issue: drawData.issue },
      drawData,
      { upsert: true, new: true }
    );

    console.log(`✅ Successfully saved Draw ${winNotice.issue} for Game ${winNotice.gameId}`);
    return true;
  } catch (err) {
    console.error('❌ Scraping failed:', err.message);
    return false;
  }
};
