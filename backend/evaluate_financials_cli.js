import mongoose from 'mongoose';
import { evaluatePredictionFinancials } from './analysis_workflow.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    const drawDate = process.argv[2];
    if (!drawDate) {
        console.error("Please provide a draw date (YYYY-MM-DD)");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');
        await evaluatePredictionFinancials(drawDate);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
main();
