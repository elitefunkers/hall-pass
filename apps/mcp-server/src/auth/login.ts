#!/usr/bin/env node
// One-time sign-in for the MCP server: `npm run login`. Sends an email code, verifies it and
// stores the session locally. The AI client never sees the code or the tokens.
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { config } from '../config.js';
import { supabase } from './session.js';

const rl = createInterface({ input: stdin, output: stdout });

try {
  const email = z.email().parse((await rl.question('Hall Pass account email: ')).trim().toLowerCase());
  const sent = await supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (sent.error) throw new Error(sent.error.message);

  const code = z.string().regex(/^\d{6}$/).parse((await rl.question('6-digit code from the email: ')).trim());
  const { data, error } = await supabase().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || !data.session) throw new Error(error?.message ?? 'Verification failed.');

  console.log(`Signed in as ${email}. Session saved to ${config.sessionFile}`);
  console.log('Restart your MCP client so the Hall Pass server picks it up.');
} catch (e) {
  console.error(`Sign-in failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
