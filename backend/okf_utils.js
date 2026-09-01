import { JournalEntry } from './models/JournalEntry.js';
import { Rule } from './models/Rule.js';
import { RuleMetadata } from './models/RuleMetadata.js';

export async function getActiveRules() {
  try {
    const rules = await Rule.find({});
    const metadata = await RuleMetadata.findOne({});
    return {
      rules: rules,
      system_info: metadata
    };
  } catch (err) {
    console.error('❌ [Database Rules Error]: Failed to fetch rules', err.message);
    return { rules: [] };
  }
}

export async function getRecentJournalEntries(limit = 5) {
  try {
    return await JournalEntry.find({})
      .sort({ date: -1 })
      .limit(limit);
  } catch (err) {
    console.error('❌ [Database Journal Error]: Failed to fetch entries', err.message);
    return [];
  }
}

export async function appendToJournal(journalDraft) {
  if (!journalDraft || !journalDraft.summary) return;
  
  try {
    await JournalEntry.create({
      entry_type: journalDraft.entry_type || 'AGENT_ENTRY',
      summary: journalDraft.summary
    });
    console.log(`📝 [Database Journal]: Saved entry.`);
  } catch (err) {
    console.error(`❌ [Database Journal Error]: Failed to save entry`, err.message);
  }
}

export async function updateRulesFile(ruleUpdates) {
  if (!ruleUpdates || !Array.isArray(ruleUpdates) || ruleUpdates.length === 0) return;

  try {
    for (const update of ruleUpdates) {
      const rule = await Rule.findOne({ rule_id: update.rule_id });
      if (rule) {
        if (update.action === "BOOST_WEIGHT") {
          rule.scoring.multiplier = parseFloat(((rule.scoring.multiplier || 1.0) * 1.1).toFixed(2));
        } else if (update.action === "PENALIZE_WEIGHT") {
          rule.scoring.multiplier = parseFloat(((rule.scoring.multiplier || 1.0) * 0.9).toFixed(2));
        }
        if (update.justification) {
          rule.last_journal_note = update.justification;
        }
        await rule.save();
      }
    }

    await RuleMetadata.findOneAndUpdate({}, { last_updated: new Date() });
    console.log(`⚙️ [Database Rules]: Updated rules in MongoDB`);
  } catch (err) {
    console.error(`❌ [Database Rules Error]: Failed to update rules`, err.message);
  }
}
