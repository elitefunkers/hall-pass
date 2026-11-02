# Hall Pass

A mobile-first dating app (iOS, Android and a responsive web preview) where people like a specific photo or prompt answer, optionally with a short note.

> **Keep this project outside OneDrive.** OneDrive turns files into "cloud files" that Expo's bundler can't read, which makes the app fail with `EINVAL ... readlink`. This copy lives in `C:\Users\Mr.Hacker\Projects\hall-pass` for that reason.

## Run it

Double-click **Start Hall Pass.cmd**, or from this folder:

```bash
npm start              # then press w (browser), a (Android emulator) or scan the QR code with Expo Go
npm run web            # straight to the browser
```

First time only: `npm run setup` installs dependencies (the launcher does this for you).

The app starts on built-in sample data. Sign up with any email, enter any 6 digits as the code, and try the full journey: some sample people have already liked you, some like you back, and they reply in chat. **Profile → Account → Testing tools** can simulate network errors or reset the sample data.

To use the real backend instead, follow `supabase/README.md` (paste one SQL file, edit two email templates, flip one setting).

```bash
npm run typecheck      # TypeScript
npm test               # data-layer rule tests
```

## Layout

```
apps/mobile/            Expo SDK 58 app (iOS, Android, web)
  src/app/              Routes: index (redirect), (auth), (onboarding), (app)/(tabs), modals
  src/components/       Shared UI on the design tokens
  src/features/         Profile view, photo grid, prompt editor, safety menu
  src/hooks/queries.ts  TanStack Query hooks
  src/services/         Typed service contracts from the brief
  src/repositories/     DataRepository interface; mock/ and supabase/ adapters
  src/theme/tokens.ts   Colour, type, spacing and motion tokens
apps/mcp-server/        MCP server (stdio) with six user-scoped tools; see its README
supabase/               setup.sql (one paste), migration, demo seed, README
docs/                   Product spec summary and architecture notes
```

## Status

Built: onboarding with the 18+ gate, email/phone code sign-in, profile details with optional approximate device location, preferences, photos, prompts, preview and publish; Discover with per-item likes, notes, pass and undo; Likes inbox; match confirmation; matches list; text chat with sending/sent/failed states and real-time updates; unmatch, block and report; profile editing, preferences, privacy controls, pause, sign out and account deletion; Supabase schema with RLS; MCP server.

Waiting on setup: running `supabase/setup.sql` in the Supabase dashboard and editing the two email templates.
