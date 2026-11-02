import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { currentUserId, NotSignedInError, supabase } from '../auth/session.js';
import { audit, rateLimit } from '../services/guards.js';

type Row = Record<string, any>;

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const failure = (message: string): ToolResult => ({ isError: true, content: [{ type: 'text', text: message }] });

function ageFrom(dob: string): number {
  const d = new Date(`${dob}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

async function run(tool: string, perMinute: number, fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    rateLimit(tool, perMinute);
    return ok(await fn());
  } catch (e) {
    if (e instanceof NotSignedInError) return failure(e.message);
    return failure(e instanceof Error ? e.message : 'Unexpected error.');
  }
}

const genders = z.enum(['woman', 'man', 'nonbinary']);

export function registerTools(server: McpServer): void {
  server.registerTool(
    'get_my_profile',
    {
      title: 'Get my Hall Pass profile',
      description:
        "Returns the signed-in user's own profile: first name, age, gender, orientation, broad area, bio, visibility and prompt answers. Never includes date of birth, contact details or location coordinates.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      run('get_my_profile', 30, async () => {
        const id = await currentUserId();
        const sb = supabase();
        const [{ data: p, error }, { data: answers }, { count: photoCount }] = await Promise.all([
          sb.from('profiles').select('first_name, date_of_birth, gender, orientation, broad_location, bio, is_active').eq('id', id).maybeSingle(),
          sb.from('profile_answers').select('answer_text, display_order, profile_prompts(prompt_text)').eq('user_id', id).order('display_order'),
          sb.from('profile_photos').select('id', { count: 'exact', head: true }).eq('user_id', id),
        ]);
        if (error) throw new Error(error.message);
        if (!p) return { profile: null, note: 'This account has not finished setting up a profile in the app.' };
        return {
          firstName: p.first_name,
          age: ageFrom(p.date_of_birth),
          gender: p.gender,
          orientation: p.orientation,
          broadArea: p.broad_location,
          bio: p.bio ?? null,
          visibleInDiscover: p.is_active,
          photoCount: photoCount ?? 0,
          prompts: ((answers ?? []) as Row[]).map((a) => ({ prompt: a.profile_prompts?.prompt_text, answer: a.answer_text })),
        };
      }),
  );

  server.registerTool(
    'get_my_preferences',
    {
      title: 'Get my discovery preferences',
      description: "Returns who the signed-in user wants to see in Discover: genders, age range and optional maximum distance.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      run('get_my_preferences', 30, async () => {
        const id = await currentUserId();
        const { data, error } = await supabase().from('preferences').select('*').eq('user_id', id).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return { preferences: null };
        return { interestedIn: data.interested_in, minAge: data.min_age, maxAge: data.max_age, maxDistanceKm: data.max_distance_km };
      }),
  );

  server.registerTool(
    'list_my_matches',
    {
      title: 'List my matches',
      description:
        "Lists the signed-in user's active matches with minimal data: match id, first name, when they matched, last activity and whose turn it is. No photos, contact details or message text.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      run('list_my_matches', 20, async () => {
        const id = await currentUserId();
        const sb = supabase();
        const { data: matches, error } = await sb.from('matches').select('id, user_a_id, user_b_id, created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
        if (error) throw new Error(error.message);
        const rows = (matches ?? []) as Row[];
        if (!rows.length) return { matches: [] };
        const otherIds = rows.map((m) => (m.user_a_id === id ? m.user_b_id : m.user_a_id));
        const [{ data: people }, { data: msgs }] = await Promise.all([
          sb.rpc('get_public_profiles', { ids: otherIds }),
          sb.from('messages').select('match_id, sender_user_id, created_at').in('match_id', rows.map((m) => m.id)).order('created_at', { ascending: false }).limit(500),
        ]);
        const names = new Map(((people ?? []) as Row[]).map((p) => [p.id, p.first_name]));
        const last = new Map<string, Row>();
        for (const msg of (msgs ?? []) as Row[]) if (!last.has(msg.match_id)) last.set(msg.match_id, msg);
        return {
          matches: rows.map((m) => {
            const other = m.user_a_id === id ? m.user_b_id : m.user_a_id;
            const lm = last.get(m.id);
            return {
              matchId: m.id,
              firstName: names.get(other) ?? 'Unavailable',
              matchedAt: m.created_at,
              lastActivityAt: lm?.created_at ?? m.created_at,
              yourTurn: lm ? lm.sender_user_id !== id : true,
            };
          }),
        };
      }),
  );

  server.registerTool(
    'get_conversation_summary',
    {
      title: 'Summarise one of my conversations',
      description:
        'Returns a limited summary of a conversation the signed-in user is part of: message counts, last activity and whose turn it is. Message text is never returned.',
      inputSchema: z.object({ matchId: z.uuid().describe('A matchId from list_my_matches') }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ matchId }) =>
      run('get_conversation_summary', 20, async () => {
        const id = await currentUserId();
        const sb = supabase();
        // RLS returns nothing for matches the user is not part of.
        const { data: m } = await sb.from('matches').select('id, user_a_id, user_b_id, created_at, status').eq('id', matchId).maybeSingle();
        if (!m) throw new Error('No conversation with that id for this account.');
        const other = m.user_a_id === id ? m.user_b_id : m.user_a_id;
        const [{ data: people }, { data: msgs }] = await Promise.all([
          sb.rpc('get_public_profiles', { ids: [other] }),
          sb.from('messages').select('sender_user_id, created_at').eq('match_id', matchId).order('created_at'),
        ]);
        const list = (msgs ?? []) as Row[];
        const lastMsg = list.at(-1);
        return {
          firstName: ((people ?? []) as Row[])[0]?.first_name ?? 'Unavailable',
          status: m.status,
          matchedAt: m.created_at,
          messageCount: list.length,
          sentByYou: list.filter((x) => x.sender_user_id === id).length,
          sentByThem: list.filter((x) => x.sender_user_id !== id).length,
          lastActivityAt: lastMsg?.created_at ?? m.created_at,
          yourTurn: m.status === 'active' && (!lastMsg || lastMsg.sender_user_id !== id),
        };
      }),
  );

  server.registerTool(
    'update_my_profile',
    {
      title: 'Update my profile text',
      description:
        "Updates permitted text fields on the signed-in user's own profile (first name, bio, broad area). Ask the user to confirm the exact new text before calling. Every call is written to the audit log.",
      inputSchema: z
        .object({
          firstName: z.string().trim().min(1).max(30).regex(/^[\p{L}][\p{L}' -]*$/u, 'Letters only').optional(),
          bio: z.string().trim().max(300).optional(),
          broadArea: z
            .string()
            .trim()
            .min(2)
            .max(40)
            .refine((v) => !/\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|lane|ln)\b/i.test(v), 'Use a broad area, not a street address.')
            .optional(),
        })
        .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to change.'),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      const fields = Object.keys(input);
      const result = await run('update_my_profile', 5, async () => {
        const id = await currentUserId();
        const patch: Row = { updated_at: new Date().toISOString() };
        if (input.firstName !== undefined) patch.first_name = input.firstName;
        if (input.bio !== undefined) patch.bio = input.bio || null;
        if (input.broadArea !== undefined) patch.broad_location = input.broadArea;
        const { error, count } = await supabase().from('profiles').update(patch, { count: 'exact' }).eq('id', id);
        if (error) throw new Error(error.message);
        if (!count) throw new Error('No profile to update. Finish setting up a profile in the app first.');
        return { updated: fields };
      });
      await audit('update_my_profile', result.isError ? 'error' : 'ok', fields).catch(() => {});
      return result;
    },
  );

  server.registerTool(
    'update_my_preferences',
    {
      title: 'Update my discovery preferences',
      description:
        "Updates the signed-in user's own discovery preferences. Ask the user to confirm the new values before calling. Every call is written to the audit log.",
      inputSchema: z
        .object({
          interestedIn: z.array(genders).min(1).optional(),
          minAge: z.number().int().min(18).max(99).optional(),
          maxAge: z.number().int().min(18).max(99).optional(),
          maxDistanceKm: z.number().int().min(1).max(300).nullable().optional().describe('null removes the distance limit'),
        })
        .refine((v) => Object.keys(v).length > 0, 'Provide at least one preference to change.'),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      const fields = Object.keys(input);
      const result = await run('update_my_preferences', 5, async () => {
        const id = await currentUserId();
        const sb = supabase();
        const { data: current, error: readError } = await sb.from('preferences').select('*').eq('user_id', id).maybeSingle();
        if (readError) throw new Error(readError.message);
        if (!current) throw new Error('No preferences yet. Finish setting up a profile in the app first.');
        const next = {
          interested_in: input.interestedIn ?? current.interested_in,
          min_age: input.minAge ?? current.min_age,
          max_age: input.maxAge ?? current.max_age,
          max_distance_km: input.maxDistanceKm !== undefined ? input.maxDistanceKm : current.max_distance_km,
        };
        if (next.min_age > next.max_age) throw new Error('Minimum age can’t be above maximum age.');
        const { error } = await sb.rpc('update_my_preferences', { prefs: next });
        if (error) throw new Error(error.message);
        return { updated: fields, preferences: { interestedIn: next.interested_in, minAge: next.min_age, maxAge: next.max_age, maxDistanceKm: next.max_distance_km } };
      });
      await audit('update_my_preferences', result.isError ? 'error' : 'ok', fields).catch(() => {});
      return result;
    },
  );
}
