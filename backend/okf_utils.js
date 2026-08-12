import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const OKF_DIR = path.join(__dirname, '../.okf');

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
