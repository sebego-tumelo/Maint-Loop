import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import readline from 'readline';
import { DrawResult } from '../models/DrawResult.js';
import { exportResults } from './export_draw_results.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function ingestData() {
    try {
        console.log('\nReading input.json...');
        // Load input data
        const inputRaw = await fs.readFile(path.join(__dirname, 'input.json'), 'utf-8');
        const input = JSON.parse(inputRaw);
        const data = input.data;

        // Map JSON to DrawResult schema
        const doc = {
            gameId: data.winNotice.gameId,
            issue: data.winNotice.issue,
            drawTime: new Date(data.winNotice.drawTime),
            winLevels: data.winNotice.winLevels,
            winNums: data.winNotice.winNums,
            winPoolInfo: data.winPoolInfoVo,
            isLatestIssue: data.isLatestIssue,
            rawResponse: data
        };

        // Persist
        await DrawResult.findOneAndUpdate(
            { gameId: doc.gameId, issue: doc.issue },
            doc,
            { upsert: true, returnDocument: 'after' }
        );
        console.log('SUCCESS: Persisted draw result to MongoDB');

        // Trigger export
        await exportResults();
        console.log('SUCCESS: Updated export files');
        return true;
    } catch (error) {
        console.error('FAILURE: Ingestion failed:', error.message);
        return false;
    }
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    async function askToContinue() {
        return new Promise((resolve) => {
            rl.question('\nWould you like to ingest again? (y/n): ', async (answer) => {
                if (answer.toLowerCase() === 'y') {
                    await ingestData();
                    resolve(await askToContinue());
                } else {
                    console.log('Exiting...');
                    await mongoose.disconnect();
                    rl.close();
                    resolve();
                }
            });
        });
    }

    // Initial ingest
    await ingestData();
    await askToContinue();
}

main().catch(console.error);
