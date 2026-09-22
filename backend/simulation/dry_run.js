import Simulator from './engine/Simulator.js';
import { DataGateway } from './engine/DataGateway.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_PATH = path.join(__dirname, 'results/audit_trail.json');

async function dryRun() {
    const [,, startRange, endRange] = process.argv;
    
    if (!startRange || !endRange) {
        console.error("Usage: node dry_run.js <YYYY-MM> <YYYY-MM>");
        process.exit(1);
    }
    
    console.log(`Starting dry run from ${startRange} to ${endRange}...`);
    
    try {
        console.log("Initializing results file at:", RESULTS_PATH);
        await fs.writeFile(RESULTS_PATH, JSON.stringify({}, null, 2));
        console.log("Results file initialized.");
        
        // Fetch historical data
        console.log("Calling getHistoricalDraws..."); 
        const historicalDraws = await DataGateway.getHistoricalDraws(); 
        console.log("getHistoricalDraws returned " + historicalDraws.length + " items");
        
        // Filter for range
        const subset = historicalDraws.filter(d => d.date && d.date >= startRange && d.date <= endRange + '-31');
        
        console.log(`Found ${subset.length} draws from ${startRange} to ${endRange}.`);
        
        // Run simulation specifically on this subset
        await Simulator.runSimulation({ subset });
        
        console.log("Dry run complete. Audit trail saved to results/audit_trail.json");
    } catch (error) {
        console.error("Dry run failed:", error);
    } finally {
        process.exit(0);
    }
}
dryRun();
