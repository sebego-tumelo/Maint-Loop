import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prediction } from '../models/Prediction.js';
import { syncAndGetStats } from '../utils.js';
import { DrawResult, DrawResultSchema } from '../models/DrawResult.js';
import { LottoMetadata, LottoMetadataSchema } from '../models/LottoMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function getDrawData(drawDate) {
    // 1. Try default connection
    const { rawDrawHistory: history1 } = await syncAndGetStats({ DrawResult, LottoMetadata });
    let drawResult = history1.find(r => r.date === drawDate);

    if (drawResult) return drawResult;

    console.log('Result not found in default DB, checking daily-lotto-scraper-api...');

    // 2. Try secondary connection
    const secondaryUri = process.env.MONGODB_URI.replace('future-live', 'daily-lotto-scraper-api');
    const secondaryConnection = mongoose.createConnection(secondaryUri);
    
    // The structure in daily-lotto-scraper-api seems completely different
    // based on the previous check. Let's try to fetch it differently.
    
    const collection = secondaryConnection.collection('drawresults');
    const doc = await collection.findOne({ drawDate: drawDate });
    
    if (doc) {
        return {
            date: doc.drawDate,
            winningNumbers: doc.winningNumbers,
            // Prize data might not exist in the same format
            prizeDivisions: []
        };
    }
    
    return null;
}

async function main() {
    const drawDate = process.argv[2];
    if (!drawDate) {
        console.error('Usage: node backend/scripts/check_draw_results.js <YYYY-MM-DD>');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Connected to MongoDB. Checking results for ${drawDate}...`);

        const prediction = await Prediction.findOne({ draw_date: drawDate });
        if (!prediction) {
            console.error(`No prediction found for date: ${drawDate}`);
            return;
        }

        const drawResult = await getDrawData(drawDate);

        if (!drawResult) {
            console.error(`No draw result found for date: ${drawDate} in either database.`);
            return;
        }

        console.log(`\n--- Draw Results for ${drawDate} ---`);
        console.log(`Winning Numbers: ${drawResult.winningNumbers.join(', ')}`);
        
        console.log(`\n--- Predicted Sets ---`);
        prediction.predicted_sets.forEach((set, index) => {
            const matches = set.numbers.filter(n => drawResult.winningNumbers.includes(n));
            console.log(`Set ${index + 1}: ${set.numbers.join(', ')} | Matches: ${matches.length} (${matches.join(', ')})`);
        });

        console.log(`\n--- Financials ---`);
        console.log(`Total Cost: R${prediction.financials.total_cost_rand}`);
        console.log(`Total Payout: R${prediction.financials.total_payout_rand}`);
        console.log(`Net Profit/Loss: R${prediction.financials.net_profit_loss_rand}`);
        
    } catch (err) {
        console.error('Error during check:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
main();
