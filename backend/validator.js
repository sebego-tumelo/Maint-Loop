import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_PATH = path.join(__dirname, 'models/agent-schema.json');

export async function validateAgentResponse(data) {
  // Simple structural validation based on the required fields
  const required = ['step', 'status', 'okf_journal_draft', 'tool_calls', 'next_prompt_payload'];
  
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate okf_journal_draft
  if (!data.okf_journal_draft.entry_type || !data.okf_journal_draft.summary) {
    throw new Error('Invalid okf_journal_draft structure');
  }

  return true;
}
