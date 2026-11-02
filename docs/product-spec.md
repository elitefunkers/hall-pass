# Hall Pass V1 — product spec summary

Condensed from the Version 1 product and technical brief.

**Vision.** An original, mobile-first dating app for adults 18+ where people respond to a specific photo or prompt with a like and an optional note. Hinge is a category reference only: no copying of its code, assets, exact layouts, wording or branding.

**Principles.** Personality before popularity · intentional interactions · safety by default · familiar navigation without a tutorial · works on small phones, large phones, tablets and the web.

**Navigation.** Discover, Likes, Matches, Profile. Conversations open from Matches or the match confirmation.

**V1 scope.**
- Onboarding: welcome, 18+ confirmation, email/phone sign-in with verification, first name, date of birth, gender, orientation, broad area, preferences (genders, age range, optional distance), 2–6 photos, three prompt answers, preview and publish.
- Discover: one profile at a time, vertically scrolling photos and prompts; like a photo, prompt or whole profile with an optional note (140 characters); visible Pass button with undo; never swipe-only.
- Likes: incoming likes showing what was liked and any note; match or pass.
- Matches and chat: text only, matched users only; sending, sent and failed states; unmatch, block, report.
- Safety: block (immediate), report with reason and details, privacy controls (visibility, distance), account deletion, moderation status fields and a manual review path.
- Every screen has designed loading, empty, error and success states.

**Out of scope for V1.** Payments and premium features, compatibility scoring, AI bios or matchmaking, voice/video, stories or feeds, events, read receipts, typing indicators, online status, advanced ID verification, automated image moderation, marketing push campaigns, analytics dashboards.

**Stack.** Expo + React Native + TypeScript, Expo Router, TanStack Query, Zustand, Zod, Supabase (Postgres, Auth, Storage, Realtime) with RLS, a separate TypeScript MCP server, Jest.

**MCP rules.** Read-only tools for the user's own profile, preferences, matches and conversation summaries; permission-gated writes to their own profile and preferences only. No bulk search, scraping or export. No AI-initiated messages, likes, matches or deletions without a user-confirmed action and audit record.

**Decisions with defaults (confirm before real users).** Name "Hall Pass" (trademark and domain checks pending) · Supabase backend · email/phone auth · coarse location only · curated prompt library · text-only messaging · stdio MCP transport for development · synthetic sample data until privacy and moderation controls are ready.
