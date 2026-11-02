import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertConfigured, config } from '../config.js';

/** File-backed storage so the session (and its refreshes) survive restarts of the MCP server. */
const fileStorage = {
  read(): Record<string, string> {
    if (!existsSync(config.sessionFile)) return {};
    try {
      return JSON.parse(readFileSync(config.sessionFile, 'utf8')) as Record<string, string>;
    } catch {
      return {};
    }
  },
  write(data: Record<string, string>): void {
    mkdirSync(dirname(config.sessionFile), { recursive: true, mode: 0o700 });
    writeFileSync(config.sessionFile, JSON.stringify(data), { mode: 0o600 });
  },
  getItem(key: string): string | null {
    return this.read()[key] ?? null;
  },
  setItem(key: string, value: string): void {
    const data = this.read();
    data[key] = value;
    this.write(data);
  },
  removeItem(key: string): void {
    const data = this.read();
    delete data[key];
    this.write(data);
  },
};

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  assertConfigured();
  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (k) => fileStorage.getItem(k),
        setItem: (k, v) => fileStorage.setItem(k, v),
        removeItem: (k) => fileStorage.removeItem(k),
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** The signed-in user's id. Every tool runs as this user, so Postgres RLS scopes all data. */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new NotSignedInError();
  return id;
}

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in. Run `npm run login` in apps/mcp-server, then restart the MCP server.');
  }
}

export function clearSessionFile(): void {
  rmSync(config.sessionFile, { force: true });
}
