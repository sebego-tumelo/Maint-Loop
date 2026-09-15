import mongoose from 'mongoose';
import { runAnalysis } from '../analysis_workflow.js';
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
        console.log('Starting manual analysis trigger...');
        
        await runAnalysis();
        
        console.log('Analysis pipeline finished.');
    } catch (err) {
        console.error('Error during manual analysis:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
main();
