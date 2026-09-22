import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Rule } from '../models/Rule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await Rule.updateMany({}, { 
            $set: { 
                "scoring.multiplier": 1.0, 
                "scoring.penalty_if_violated": 0.0 
            } 
        });
        console.log('Reset weights on', result.modifiedCount, 'rules.');
    } catch (err) {
        console.error('Error resetting weights:', err);
    } finally {
        await mongoose.disconnect();
    }
}
reset();
