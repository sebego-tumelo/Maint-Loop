import { generateUniqueCandidates, scoreAndFilterCandidates } from './candidateGenerator.js';
import { getActiveRules, OKF_DIR } from './okf_utils.js';

export const predictionSystemInstruction = `
You are operating in MODE B: CANDIDATE GENERATOR & PREDICTION SYNTHESIS for Daily Lotto (5/36).
Your task is to select the top X=3 final candidate sets from 20 pre-scored options that have been filtered using active rules from /okf/rules.json and verified for 100% historical uniqueness.

INSTRUCTIONS:
1. Review the top 20 candidate combinations provided.
2. Select 3 sets offering optimal complementary coverage based on observed rules.
3. Provide the speculative narrative explaining why these combinations fit current rules.
4. Draft a journal entry for /okf/journal.md.
`;

export const predictionToolsList = [
  {
    name: 'fetch_raw_results',
    description: 'Fetches raw draw history from the API for Mode A rule evaluation.',
    parameters: { type: 'object', properties: {} }, 
    execute: async () => {
      const apiBaseUrl = process.env.LOTTERY_API_BASE_URL || 'http://localhost:3000';
      try {
        const response = await fetch(`${apiBaseUrl}/api/results`);
        const json = await response.json();
        return { content: [{ type: 'text', text: JSON.stringify(json.data || []) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
      }
    }
  },
  {
    name: 'generate_candidate_predictions',
    description: 'Generates 1,000 unique candidates, filters exact history matches, and scores them purely using observed rules in /okf/rules.json.',
    parameters: { type: 'object', properties: {} },
    execute: async () => {
      try {
        const rulesPath = path.join(OKF_DIR, 'rules.json');
        const rawCandidates = await generateUniqueCandidates(1000);
        const topScoredCandidates = await scoreAndFilterCandidates(rawCandidates, rulesPath);
        
        return {
          content: [{ type: 'text', text: JSON.stringify({
            candidates_generated: 1000,
            unique_history_checked: true,
            top_20_candidates: topScoredCandidates
          }) }]
        };
      } catch (err) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
      }
    }
  }
];