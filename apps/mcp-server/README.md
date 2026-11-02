# Hall Pass MCP server

A local (stdio) MCP server that lets an AI assistant such as Claude read and make small edits to **your own** Hall Pass account. It is not needed for the app to work.

## Tools

| Tool | Type | What it returns or changes |
|---|---|---|
| `get_my_profile` | read | Your name, age, gender, orientation, broad area, bio, visibility, prompt answers |
| `get_my_preferences` | read | Genders, age range, distance limit |
| `list_my_matches` | read | Match id, first name, dates, whose turn it is |
| `get_conversation_summary` | read | Message counts, last activity, whose turn it is (never message text) |
| `update_my_profile` | write | First name, bio or broad area (audited) |
| `update_my_preferences` | write | Genders, age range, distance limit (audited) |

Deliberately missing: searching or listing other users, sending messages, liking, accepting matches, deleting the account. Those need a person in the app.

Safeguards: every call runs as the signed-in user, so Supabase Row Level Security limits it to that user's data. Inputs are validated with Zod, write tools are limited to 5 calls a minute, and each write is recorded in `mcp_audit_log` (field names only). No dates of birth, contact details, coordinates or message bodies are returned.

## Setup

Requires the Supabase setup in `supabase/README.md` and a Hall Pass profile created in the app.

```bash
cd apps/mcp-server
npm install
npm run build
npm run login        # enter your account email, then the 6-digit code from the email
```

The session is saved in `~/.hallpass-mcp/session.json`. Treat that file like a password; `npm run logout` deletes it.

### Connect to Claude Code

```bash
claude mcp add hall-pass -- node "C:/Users/Mr.Hacker/Projects/hall-pass/apps/mcp-server/dist/index.js"
```

### Connect to Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hall-pass": {
      "command": "node",
      "args": ["C:/Users/Mr.Hacker/Projects/hall-pass/apps/mcp-server/dist/index.js"]
    }
  }
}
```

Supabase settings are read from `apps/mobile/.env.local`, or from `HALLPASS_SUPABASE_URL` and `HALLPASS_SUPABASE_ANON_KEY` if set.
