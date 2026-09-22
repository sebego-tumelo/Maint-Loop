import Simulator from './engine/Simulator.js';
import { DataGateway } from './engine/DataGateway.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_PATH = path.join(__dirname, 'results/audit_trail.json');

async function dryRun() {
    console.log("Starting dry run for Jan 2019...");
    
    // Initialize results file
    await fs.writeFile(RESULTS_PATH, JSON.stringify({}, null, 2));
    
    // Fetch historical data
    const historicalDraws = await DataGateway.getHistoricalDraws();
    
    // Filter for January 2019
    const jan2019 = historicalDraws.filter(d => d.date.startsWith('2019-01'));
    
    console.log(`Found ${jan2019.length} draws for Jan 2019.`);
    
    // Run simulation specifically on this subset
    await Simulator.runSimulation({ subset: jan2019 });
    
    console.log("Dry run complete. Audit trail saved to results/audit_trail.json");
}
dryRun();
