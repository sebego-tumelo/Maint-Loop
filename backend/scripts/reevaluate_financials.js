import mongoose from 'mongoose';
import { evaluatePredictionFinancials } from '../analysis_workflow.js';
import { Prediction } from '../models/Prediction.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const predictions = await Prediction.find({ 'actual_outcome.evaluated': true });
        console.log(`Found ${predictions.length} evaluated predictions to re-evaluate.`);

        for (const pred of predictions) {
            console.log(`Re-evaluating financials for ${pred.draw_date}...`);
            try {
                await evaluatePredictionFinancials(pred.draw_date);
            } catch (e) {
                console.error(`Error re-evaluating ${pred.draw_date}:`, e.message);
            }
        }

        console.log('Finished re-evaluating all predictions.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
main();
