#!/usr/bin/env node
import { config } from '../config.js';
import { clearSessionFile, supabase } from './session.js';

try {
  await supabase().auth.signOut();
} catch {
  // The local session is removed below even if the server can't be reached.
}
clearSessionFile();
console.log(`Signed out. Removed ${config.sessionFile}`);
