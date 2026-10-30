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
            console.log('Paste your JSON, then press Ctrl+D (twice if needed):');
            inputRaw = await new Promise((resolve, reject) => {
                let data = '';
                // Read from stdin until end
                process.stdin.resume();
                process.stdin.on('data', chunk => {
                    data += chunk;
                });
                process.stdin.on('end', () => {
                    console.log('\nJSON received. Processing...');
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
        
        // Handle both single object and array of objects
        const items = Array.isArray(input) ? input : [input];
        console.log(`Found ${items.length} draw result(s) to ingest.`);

        for (const item of items) {
            const data = item.data;
            if (!data || !data.winNotice) {
                console.warn('Skipping invalid item (missing data or winNotice)');
                continue;
            }

            console.log(`Mapping data for issue: ${data.winNotice.issue}...`);
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
            console.log(`SUCCESS: Persisted issue ${doc.issue} to MongoDB`);
        }

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
