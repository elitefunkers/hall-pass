# Architecture

## Data flow

Screens never talk to a backend directly. They call hooks in `src/hooks/queries.ts`, which call the services in `src/services`, which call the single `DataRepository` chosen in `src/repositories/index.ts`.

- `mock` (default): `createMockRepository()` keeps an on-device database in AsyncStorage, adds 200–500 ms of latency, and enforces the same rules the server will: eligibility, blocks, one response per person, one match per pair, participant-only messaging, retry-safe sends.
- `supabase`: set `EXPO_PUBLIC_DATA_SOURCE=supabase` once an adapter exists. The SQL in `supabase/migrations` enforces those rules with RLS and `SECURITY DEFINER` functions, so a modified client can't skip them.

Validation lives in `src/domain/schemas.ts` (Zod) and runs both in forms and inside the repository.

## Navigation

`src/app/_layout.tsx` uses three `Stack.Protected` groups driven by the persisted session store:

| Guard | Group | Screens |
|---|---|---|
| signed out | `(auth)` | welcome, age gate, sign in, verify |
| signed in, no profile | `(onboarding)` | details, preferences, photos, prompts, preview |
| signed in with profile | `(app)` | tabs (Discover, Likes, Matches, Profile), person, like composer, match, chat, report, settings |

## Design system

Tokens are in `src/theme/tokens.ts`: cream canvas, charcoal ink, terracotta accent and wine for the match moment. Type is Newsreader (names, prompts, answers) with Figtree for interface text. Text contrast on the canvas ranges from 5.2:1 to 16:1. Touch targets are at least 48 pt, every icon-only control has an accessibility label, and selection is never shown by colour alone (check icons, weight changes, text labels). Content is capped at 560 pt wide on tablets and the web. Motion is limited to a short profile fade and one authored match moment, and both respect Reduce Motion.

## Trust and safety

- 18+ confirmation before sign-up, and date of birth validated again at profile creation (client and database `check`).
- Other people only ever receive age, never date of birth; location is a typed broad area plus an optional coarse distance label.
- Block removes the person from Discover, Likes and Matches immediately and stops messaging; report records a reason and optional details with a moderation status, and can block in the same step.
- Account deletion requires typing DELETE and removes the profile, interactions, matches and messages.

## MCP server

Planned as a separate `apps/mcp-server` package (Phase 6). It will call the same authenticated backend as the app, expose only the narrow tools in the brief, and audit every write. It is not required for the app to run.
