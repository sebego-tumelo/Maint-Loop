import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateUniqueCandidates, scoreAndFilterCandidates } from './candidateGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OKF_DIR = path.join(__dirname, '../okf');

export const analysisSystemInstruction = `
You are an advanced lottery analysis agent operating in MODE A: DATASET ANALYSIS & RULE DISCOVERY for Daily Lotto (5/36).
Your goal is to evaluate raw historical draw data, observe statistical anomalies, mutate rule weights in /okf/rules.json, and record entries in /okf/journal.md.

OUTPUT FORMAT:
You MUST return ONLY a JSON object. Do not include any introductory text, markdown headers, or markdown code blocks.
The JSON must adhere to this structure:
{
  "okf_journal_draft": {
    "summary": "string",
    "entry_type": "string",
    "rule_updates": [
      {
        "rule_id": "string",
        "action": "BOOST_WEIGHT" | "PENALIZE_WEIGHT",
        "justification": "string"
      }
    ]
  }
}
`;

export const predictionSystemInstruction = `
You are operating in MODE B: CANDIDATE GENERATOR & PREDICTION SYNTHESIS for Daily Lotto (5/36).
Your task is to select the top X=3 final candidate sets from 20 pre-scored options that have been filtered using active rules from /okf/rules.json and verified for 100% historical uniqueness.

INSTRUCTIONS:
1. Review the top 20 candidate combinations provided.
2. Select 3 sets offering optimal complementary coverage based on observed rules.
3. Provide the speculative narrative explaining why these combinations fit current rules.
4. Draft a journal entry for /okf/journal.md.
`;

export async function getActiveRules() {
  const rulesPath = path.join(OKF_DIR, 'rules.json');
  try {
    const data = await fs.readFile(rulesPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return { rules: [] };
  }
}

export async function appendToJournal(journalDraft) {
  if (!journalDraft || !journalDraft.summary) return;
  const journalPath = path.join(OKF_DIR, 'journal.md');
  const timestamp = new Date().toISOString().split('T')[0];
  
  const entry = `\n\n### [${timestamp}] - ${journalDraft.entry_type || 'AGENT_ENTRY'}\n` +
                `**Summary:** ${journalDraft.summary}\n`;
                
  try {
    await fs.appendFile(journalPath, entry, 'utf-8');
    console.log(`📝 [OKF Journal]: Appended entry to journal.md`);
  } catch (err) {
    console.error(`❌ [OKF Journal Error]: Failed to write to journal.md`, err.message);
  }
}

export async function updateRulesFile(ruleUpdates) {
  if (!ruleUpdates || !Array.isArray(ruleUpdates) || ruleUpdates.length === 0) return;
  const rulesPath = path.join(OKF_DIR, 'rules.json');

  try {
    const rawData = await fs.readFile(rulesPath, 'utf-8');
    const rulesObj = JSON.parse(rawData);

    for (const update of ruleUpdates) {
      const existingRule = rulesObj.rules.find(r => r.rule_id === update.rule_id);
      if (existingRule) {
        if (update.action === "BOOST_WEIGHT") {
          existingRule.scoring.multiplier = parseFloat(((existingRule.scoring.multiplier || 1.0) * 1.1).toFixed(2));
        } else if (update.action === "PENALIZE_WEIGHT") {
          existingRule.scoring.multiplier = parseFloat(((existingRule.scoring.multiplier || 1.0) * 0.9).toFixed(2));
        }
        if (update.justification) {
          existingRule.last_journal_note = update.justification;
        }
      }
    }

    rulesObj.system_info.last_updated = new Date().toISOString().split('T')[0];
    await fs.writeFile(rulesPath, JSON.stringify(rulesObj, null, 2), 'utf-8');
    console.log(`⚙️ [OKF Rules]: Updated /okf/rules.json`);
  } catch (err) {
    console.error(`❌ [OKF Rules Error]: Failed to update rules.json`, err.message);
  }
}

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