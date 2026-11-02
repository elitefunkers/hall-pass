# Supabase backend

Project: `https://axulkfsijnpxlbajepjk.supabase.co` (settings live in `apps/mobile/.env.local`).

## One-time setup (about 5 minutes)

1. **Create the tables.** In the Supabase dashboard open **SQL Editor → New query**, paste the whole of `supabase/setup.sql`, and press **Run**. It creates the schema, security rules, photo storage and 12 synthetic demo people.
2. **Send codes, not links.** Open **Authentication → Emails → Templates**. In both **Magic Link** and **Confirm signup**, add the code to the message, for example:
   `Your Hall Pass code is {{ .Token }}`
   Without this, emails contain a link and the app's 6-digit code screen can't be used.
3. **Switch the app to Supabase.** In `apps/mobile/.env.local` change `EXPO_PUBLIC_DATA_SOURCE=mock` to `EXPO_PUBLIC_DATA_SOURCE=supabase`, then restart the dev server.

Notes:

- Supabase's built-in email sender allows only a few emails per hour and one code per address every 60 seconds. Add your own SMTP provider (Authentication → Emails → SMTP) before inviting testers.
- Phone sign-in needs an SMS provider (Authentication → Providers → Phone). Until then, use email.
- Photos are post-moderated in this build: they show immediately and reports can reject them. To require approval first, change `profile_photos.moderation_status` to default to `'pending'`.

## What the database enforces

- Clients get column-level grants only: nobody can set their own moderation status or edit their date of birth.
- Row Level Security on every table. Other people's profiles are only visible through `get_public_profiles()` and `suggested_profiles()`, and only to people who could legitimately see them (eligible for discovery, liked you, or matched). There is no way to list all users.
- Likes, passes, matches, blocks and unmatches go through `SECURITY DEFINER` functions that re-check eligibility and blocks. One response per person, one match per pair (canonical order + unique constraint).
- Messages can be read only by the two people in a match and sent only into active, unblocked matches; `(sender, client_id)` is unique so retries never duplicate.
- Locations are stored rounded (the app rounds to about 5 km first) and are never returned; other people only receive a distance in km.
- `delete_my_account()` removes the auth user; everything else cascades. The app removes the user's photos from storage first.
- `mcp_audit_log` records every write the MCP server makes (field names only, no values).

## Before real users

Run `select remove_demo_data();` in the SQL Editor. It deletes the demo people and the demo-only triggers (auto-likes and auto-replies).
