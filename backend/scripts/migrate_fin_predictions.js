import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prediction } from '../models/Prediction.js';
import { evaluatePredictionFinancials } from '../analysis_workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB.');

        const predictions = await Prediction.find({});
        console.log(`Found ${predictions.length} predictions to process.`);

        for (const prediction of predictions) {
            console.log(`\nProcessing: ${prediction.draw_date}`);
            
            try {
                // Initialize financials if they don't exist
                if (!prediction.financials) {
                    console.log('  -> Initializing missing financials.');
                    prediction.financials = {
                        total_cost_rand: prediction.predicted_sets.length * 3,
                        total_payout_rand: 0,
                        net_profit_loss_rand: -(prediction.predicted_sets.length * 3),
                        roi_percentage: -100
                    };
                }

                // Re-calculate financials using the workflow logic
                // This will handle the correct total_payout_rand calculation
                await evaluatePredictionFinancials(prediction.draw_date);
                console.log(`  -> Financials updated successfully for ${prediction.draw_date}.`);
                
            } catch (err) {
                console.error(`  ❌ Error processing ${prediction.draw_date}: ${err.message}`);
                // Continue with next prediction even if one fails
            }
        }

        console.log('\nMigration complete.');
    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrate();
