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
        console.log('\n--- Ingest Draw Result ---');
        console.log('1. Read from input.json');
        console.log('2. Paste JSON');
        
        const option = await new Promise(resolve => rl.question('Select option (1/2): ', resolve));
        
        let inputRaw;
        if (option === '2') {
            console.log('Paste your JSON (end with Ctrl+D):');
            inputRaw = await new Promise((resolve, reject) => {
                let data = '';
                process.stdin.on('data', chunk => {
                    data += chunk;
                    process.stdout.write('.'); // Simple progress indicator
                });
                process.stdin.on('end', () => {
                    process.stdout.write('\nProcessing JSON data...\n');
                    resolve(data);
                });
                process.stdin.on('error', reject);
            });
        } else {
            console.log('Reading input.json...');
            inputRaw = await fs.readFile(path.join(__dirname, 'input.json'), 'utf-8');
        }

        console.log('Parsing JSON...');
        const input = JSON.parse(inputRaw);
        const data = input.data;

        console.log('Mapping data...');
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
        // Need to create a new interface or re-setup stdin to be able to ask again
        // because we consumed stdin for pasting
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
