import mongoose from 'mongoose';
import { checkSetUniqueness } from './analysis_workflow.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    // Usage: node backend/check_uniqueness_cli.js 1,2,3,4,5
    const input = process.argv[2];
    if (!input) {
        console.error("Please provide a set of numbers (comma separated, e.g., 1,2,3,4,5)");
        process.exit(1);
    }
    
    const numbers = input.split(',').map(n => parseInt(n.trim(), 10));

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await checkSetUniqueness(numbers);
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
main();
