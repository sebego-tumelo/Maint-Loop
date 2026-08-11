import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_PATH = path.join(__dirname, 'models/agent-schema.json');

export async function validateAgentResponse(data) {
  // We strictly require the journal draft for persistence, 
  // but relax requirements for other agent state fields during analysis mode.
  if (!data.okf_journal_draft) {
    throw new Error('Missing required field: okf_journal_draft');
  }

  // Validate okf_journal_draft structure
  if (!data.okf_journal_draft.entry_type || !data.okf_journal_draft.summary) {
    throw new Error('Invalid okf_journal_draft structure');
  }

  return true;
}
