import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Reads KEY=value lines from the mobile app's .env.local so both apps share one Supabase project. */
function readMobileEnv(): Record<string, string> {
  const file = resolve(here, '..', '..', 'mobile', '.env.local');
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const mobile = readMobileEnv();

export const config = {
  supabaseUrl: process.env.HALLPASS_SUPABASE_URL ?? mobile.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.HALLPASS_SUPABASE_ANON_KEY ?? mobile.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Holds the signed-in user's Supabase session (refresh token). Keep it private. */
  sessionFile: process.env.HALLPASS_MCP_SESSION_FILE ?? join(homedir(), '.hallpass-mcp', 'session.json'),
};

export function assertConfigured(): void {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'Supabase settings not found. Set HALLPASS_SUPABASE_URL and HALLPASS_SUPABASE_ANON_KEY, or keep apps/mobile/.env.local next to this server.',
    );
  }
}
