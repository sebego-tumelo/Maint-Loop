import Simulator from './engine/Simulator.js';

async function main() {
    try {
        console.log('Starting Simulation Sandbox...');
        
        // Define simulation config (e.g., iteration limits, learning rates)
        const config = {
            learningRate: 0.05,
            targetRate: 0.2
        };

        await Simulator.runSimulation(config);
        
        console.log('Simulation finished successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Simulation failed:', err);
        process.exit(1);
    }
}

main();
