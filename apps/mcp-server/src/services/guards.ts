import { supabase } from '../auth/session.js';

/** Fixed-window limiter per tool. A local MCP server has one user, so in-memory state is enough. */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(tool: string, maxPerMinute: number): void {
  const now = Date.now();
  const w = windows.get(tool);
  if (!w || now - w.start > 60_000) {
    windows.set(tool, { start: now, count: 1 });
    return;
  }
  w.count += 1;
  if (w.count > maxPerMinute) throw new Error(`Too many ${tool} calls. Try again in a minute.`);
}

/**
 * Records a write in mcp_audit_log (RLS: users can only write and read their own rows).
 * Only field names are stored, never the values, so the log holds no profile content.
 */
export async function audit(tool: string, outcome: 'ok' | 'denied' | 'error', fields: string[], note?: string): Promise<void> {
  const { error } = await supabase()
    .from('mcp_audit_log')
    .insert({ tool, outcome, detail: { fields, ...(note ? { note } : {}) } });
  if (error) console.error(`[hall-pass-mcp] audit write failed for ${tool}: ${error.message}`);
}
