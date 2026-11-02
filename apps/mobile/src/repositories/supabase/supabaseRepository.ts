import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { limits } from '@/config';
import { likeCommentSchema, messageBodySchema, preferencesSchema, profileDetailsSchema, promptAnswerSchema, reportSchema } from '@/domain/schemas';
import type {
  CoarseLocation,
  IncomingLike,
  LikedItemPreview,
  Match,
  Message,
  Preferences,
  PrivacySettings,
  Profile,
  ProfilePhoto,
  PromptAnswer,
  PublicProfile,
  Session,
} from '@/types/domain';
import { coarsen } from '@/utils/location';
import { DataError, type DataRepository } from '../types';
import { getSupabase } from './client';

const BUCKET = 'profile-photos';
const PAGE_SIZE = 5;
const SIGNED_URL_SECONDS = 60 * 60;

type Row = Record<string, any>;

function fail(error: PostgrestError | { message: string; code?: string; status?: number } | null): never {
  const message = error?.message ?? 'Something went wrong.';
  const code = (error as { code?: string })?.code;
  if (code === '23505') throw new DataError('conflict', 'You’ve already responded to this person.');
  if (code === '42501' || /permission|not authenticated|JWT/i.test(message)) throw new DataError('forbidden', 'Please sign in again.');
  if (/fetch|network|Failed to fetch/i.test(message)) throw new DataError('network', 'We couldn’t reach Hall Pass. Check your connection and try again.');
  if (/unavailable|not available|not found/i.test(message)) throw new DataError('not_found', 'This isn’t available any more.');
  throw new DataError('invalid', message.charAt(0).toUpperCase() + message.slice(1));
}

function check<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) fail(result.error);
  return result.data;
}

function randomId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function distanceLabel(km: number | null | undefined): string | undefined {
  if (km == null) return undefined;
  return km <= 2 ? 'Less than 2 km away' : `About ${km} km away`;
}

export function createSupabaseRepository(): DataRepository {
  const sb = (): SupabaseClient => getSupabase();

  async function myId(): Promise<string> {
    const { data } = await sb().auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new DataError('forbidden', 'Please sign in again.');
    return id;
  }

  /** Storage paths become short-lived signed URLs; seeded demo photos are already full URLs. */
  async function resolveUris(paths: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const toSign = paths.filter((p) => !/^https?:\/\//.test(p));
    paths.filter((p) => /^https?:\/\//.test(p)).forEach((p) => map.set(p, p));
    if (toSign.length) {
      const { data, error } = await sb().storage.from(BUCKET).createSignedUrls(toSign, SIGNED_URL_SECONDS);
      if (error) fail(error);
      data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
    }
    return map;
  }

  async function photosAndAnswers(userIds: string[]) {
    if (!userIds.length) return { photos: new Map<string, ProfilePhoto[]>(), answers: new Map<string, PromptAnswer[]>() };
    const [photoRows, answerRows] = await Promise.all([
      sb().from('profile_photos').select('id, user_id, storage_path, display_order, moderation_status').in('user_id', userIds).order('display_order'),
      sb().from('profile_answers').select('id, user_id, prompt_id, answer_text, display_order, profile_prompts(prompt_text)').in('user_id', userIds).order('display_order'),
    ]);
    const photosData = check(photoRows) as Row[];
    const uris = await resolveUris(photosData.map((p) => p.storage_path));
    const photos = new Map<string, ProfilePhoto[]>();
    for (const p of photosData) {
      const list = photos.get(p.user_id) ?? [];
      list.push({ id: p.id, uri: uris.get(p.storage_path) ?? '', order: p.display_order, moderationStatus: p.moderation_status });
      photos.set(p.user_id, list);
    }
    const answers = new Map<string, PromptAnswer[]>();
    for (const a of check(answerRows) as Row[]) {
      const list = answers.get(a.user_id) ?? [];
      list.push({ id: a.id, promptId: a.prompt_id, promptText: a.profile_prompts?.prompt_text ?? '', answer: a.answer_text, order: a.display_order });
      answers.set(a.user_id, list);
    }
    return { photos, answers };
  }

  async function hydrate(rows: Row[]): Promise<PublicProfile[]> {
    const { photos, answers } = await photosAndAnswers(rows.map((r) => r.id));
    return rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      age: r.age,
      gender: r.gender,
      bio: r.bio ?? undefined,
      broadLocation: r.broad_location,
      distanceLabel: distanceLabel(r.distance_km),
      photos: photos.get(r.id) ?? [],
      answers: answers.get(r.id) ?? [],
    }));
  }

  async function publicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
    if (!ids.length) return new Map();
    const rows = check(await sb().rpc('get_public_profiles', { ids })) as Row[];
    const profiles = await hydrate(rows);
    return new Map(profiles.map((p) => [p.id, p]));
  }

  async function getMine(): Promise<Profile | null> {
    const id = await myId();
    const row = check(await sb().from('profiles').select('*').eq('id', id).maybeSingle()) as Row | null;
    if (!row) return null;
    const { photos, answers } = await photosAndAnswers([id]);
    return {
      id,
      firstName: row.first_name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      orientation: row.orientation,
      bio: row.bio ?? undefined,
      broadLocation: row.broad_location,
      photos: photos.get(id) ?? [],
      answers: answers.get(id) ?? [],
      isActive: row.is_active,
    };
  }

  async function uploadPhoto(userId: string, uri: string): Promise<string> {
    let body: ArrayBuffer;
    let contentType = 'image/jpeg';
    try {
      const response = await fetch(uri);
      contentType = response.headers.get('content-type')?.split(';')[0] || contentType;
      body = await response.arrayBuffer();
    } catch {
      throw new DataError('invalid', 'We couldn’t read that photo. Try choosing it again.');
    }
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const path = `${userId}/${randomId()}.${ext}`;
    const { error } = await sb().storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) throw new DataError('network', 'A photo didn’t finish uploading. Check your connection and try again.');
    return path;
  }

  async function privacy(): Promise<PrivacySettings> {
    const id = await myId();
    const row = check(await sb().from('profiles').select('show_distance, coarse_lat').eq('id', id).single()) as Row;
    return { showDistance: row.show_distance, useDeviceLocation: row.coarse_lat != null };
  }

  const listeners = new Set<(event: { matchId: string }) => void>();
  let channel: ReturnType<SupabaseClient['channel']> | null = null;

  const repo: DataRepository = {
    auth: {
      async getSession() {
        const { data } = await sb().auth.getSession();
        const user = data.session?.user;
        if (!user) return null;
        return { userId: user.id, identifier: user.email ?? user.phone ?? '', method: user.email ? 'email' : 'phone' } satisfies Session;
      },
      async requestCode(method, identifier) {
        const value = identifier.trim();
        const { error } =
          method === 'email'
            ? await sb().auth.signInWithOtp({ email: value.toLowerCase(), options: { shouldCreateUser: true } })
            : await sb().auth.signInWithOtp({ phone: value.replace(/[\s()-]/g, '') });
        if (error) {
          if (/rate|seconds/i.test(error.message)) throw new DataError('invalid', 'Please wait a minute before requesting another code.');
          if (/phone|sms/i.test(error.message)) throw new DataError('invalid', 'Phone sign-in isn’t set up yet. Use email for now.');
          fail(error);
        }
        return { verificationId: JSON.stringify({ method, identifier: method === 'email' ? value.toLowerCase() : value.replace(/[\s()-]/g, '') }) };
      },
      async verifyCode(verificationId, code) {
        const { method, identifier } = JSON.parse(verificationId) as { method: Session['method']; identifier: string };
        const { data, error } =
          method === 'email'
            ? await sb().auth.verifyOtp({ email: identifier, token: code, type: 'email' })
            : await sb().auth.verifyOtp({ phone: identifier, token: code, type: 'sms' });
        if (error || !data.user) throw new DataError('invalid', 'That code isn’t right or has expired. Check it or request a new one.');
        return { userId: data.user.id, identifier, method };
      },
      async signOut() {
        await sb().auth.signOut();
        channel?.unsubscribe();
        channel = null;
      },
    },

    profile: {
      getMine,
      async create(input) {
        const id = await myId();
        const details = profileDetailsSchema.safeParse(input);
        if (!details.success) throw new DataError('invalid', details.error.issues[0]?.message ?? 'Check your details.');
        const prefs = preferencesSchema.safeParse(input.preferences);
        if (!prefs.success) throw new DataError('invalid', prefs.error.issues[0]?.message ?? 'Check your preferences.');
        const paths: string[] = [];
        for (const uri of input.photoUris.slice(0, limits.maxPhotos)) paths.push(await uploadPhoto(id, uri));
        const loc = input.coarseLocation ? coarsen(input.coarseLocation) : null;
        check(
          await sb().rpc('create_my_profile', {
            profile: {
              first_name: details.data.firstName,
              date_of_birth: details.data.dateOfBirth,
              gender: details.data.gender,
              orientation: details.data.orientation,
              broad_location: details.data.broadLocation,
              bio: input.bio ?? null,
              coarse_lat: loc?.lat ?? null,
              coarse_lng: loc?.lng ?? null,
            },
            prefs: {
              interested_in: prefs.data.interestedIn,
              min_age: prefs.data.minAge,
              max_age: prefs.data.maxAge,
              max_distance_km: prefs.data.maxDistanceKm,
            },
            answers: input.answers.map((a) => ({ prompt_id: a.promptId, answer: promptAnswerSchema.parse(a.answer) })),
            photo_paths: paths,
          }),
        );
        const profile = await getMine();
        if (!profile) throw new DataError('invalid', 'Your profile didn’t save. Try again.');
        return profile;
      },
      async updateDetails(patch) {
        const id = await myId();
        const current = await getMine();
        if (!current) throw new DataError('not_found', 'Finish setting up your profile first.');
        const parsed = profileDetailsSchema.safeParse({ ...current, ...patch });
        if (!parsed.success) throw new DataError('invalid', parsed.error.issues[0]?.message ?? 'Check your details.');
        check(
          await sb()
            .from('profiles')
            .update({
              first_name: parsed.data.firstName,
              gender: parsed.data.gender,
              orientation: parsed.data.orientation,
              broad_location: parsed.data.broadLocation,
              bio: patch.bio !== undefined ? patch.bio.trim().slice(0, limits.bio) || null : (current.bio ?? null),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id),
        );
        return (await getMine())!;
      },
      async addPhoto(uri) {
        const id = await myId();
        const current = await getMine();
        const count = current?.photos.length ?? 0;
        if (count >= limits.maxPhotos) throw new DataError('invalid', `You can have up to ${limits.maxPhotos} photos.`);
        const path = await uploadPhoto(id, uri);
        check(await sb().from('profile_photos').insert({ user_id: id, storage_path: path, display_order: count }));
        return (await getMine())!;
      },
      async removePhoto(photoId) {
        const id = await myId();
        const rows = check(await sb().from('profile_photos').select('id, storage_path').eq('user_id', id).order('display_order')) as Row[];
        if (rows.length <= limits.minPhotos) throw new DataError('invalid', `Keep at least ${limits.minPhotos} photos on your profile.`);
        const target = rows.find((r) => r.id === photoId);
        if (!target) throw new DataError('not_found', 'That photo was already removed.');
        check(await sb().from('profile_photos').delete().eq('id', photoId));
        if (!/^https?:\/\//.test(target.storage_path)) await sb().storage.from(BUCKET).remove([target.storage_path]);
        check(await sb().rpc('reorder_my_photos', { photo_ids: rows.filter((r) => r.id !== photoId).map((r) => r.id) }));
        return (await getMine())!;
      },
      async reorderPhotos(photoIds) {
        check(await sb().rpc('reorder_my_photos', { photo_ids: photoIds }));
        return (await getMine())!;
      },
      async saveAnswers(answers) {
        check(await sb().rpc('save_my_answers', { answers: answers.map((a) => ({ prompt_id: a.promptId, answer: promptAnswerSchema.parse(a.answer) })) }));
        return (await getMine())!;
      },
      async setActive(isActive) {
        const id = await myId();
        check(await sb().from('profiles').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id));
        return (await getMine())!;
      },
      async getPromptLibrary() {
        const rows = check(await sb().from('profile_prompts').select('id, prompt_text').order('id')) as Row[];
        return rows.map((r) => ({ id: r.id, text: r.prompt_text }));
      },
      async getPreferences() {
        const id = await myId();
        const r = check(await sb().from('preferences').select('*').eq('user_id', id).single()) as Row;
        return { interestedIn: r.interested_in, minAge: r.min_age, maxAge: r.max_age, maxDistanceKm: r.max_distance_km } satisfies Preferences;
      },
      async savePreferences(preferences) {
        const parsed = preferencesSchema.safeParse(preferences);
        if (!parsed.success) throw new DataError('invalid', parsed.error.issues[0]?.message ?? 'Check your preferences.');
        check(
          await sb().rpc('update_my_preferences', {
            prefs: {
              interested_in: parsed.data.interestedIn,
              min_age: parsed.data.minAge,
              max_age: parsed.data.maxAge,
              max_distance_km: parsed.data.maxDistanceKm,
            },
          }),
        );
        return parsed.data;
      },
      getPrivacy: privacy,
      async savePrivacy(settings) {
        const id = await myId();
        check(await sb().from('profiles').update({ show_distance: Boolean(settings.showDistance) }).eq('id', id));
        return privacy();
      },
      async updateLocation(location: CoarseLocation | null) {
        const id = await myId();
        const loc = location ? coarsen(location) : null;
        check(await sb().from('profiles').update({ coarse_lat: loc?.lat ?? null, coarse_lng: loc?.lng ?? null }).eq('id', id));
        return privacy();
      },
    },

    discovery: {
      async getSuggested(cursor) {
        const rows = check(await sb().rpc('suggested_profiles', { page_size: PAGE_SIZE, after_id: cursor ?? null })) as Row[];
        const items = await hydrate(rows);
        return { items, nextCursor: rows.length === PAGE_SIZE ? rows[rows.length - 1].id : null };
      },
      async getProfile(userId) {
        const p = (await publicProfiles([userId])).get(userId);
        if (!p) throw new DataError('not_found', 'This profile isn’t available.');
        return p;
      },
      async like(input) {
        const comment = likeCommentSchema.parse(input.comment);
        const matchId = check(
          await sb().rpc('like_profile_item', {
            target: input.targetUserId,
            item_type: input.target.type,
            item_id: input.target.itemId ?? null,
            comment: comment || null,
          }),
        ) as string | null;
        return { matchId: matchId ?? null };
      },
      async pass(userId) {
        check(await sb().rpc('pass_profile', { target: userId }));
      },
      async undoPass(userId) {
        check(await sb().rpc('undo_pass', { target: userId }));
      },
    },

    likes: {
      async getIncoming() {
        const id = await myId();
        const [likeRows, mine, me] = await Promise.all([
          sb()
            .from('interactions')
            .select('id, actor_user_id, target_item_type, target_item_id, comment_text, created_at')
            .eq('target_user_id', id)
            .eq('action', 'like')
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(50),
          sb().from('interactions').select('target_user_id').eq('actor_user_id', id),
          getMine(),
        ]);
        const responded = new Set((check(mine) as Row[]).map((r) => r.target_user_id));
        const likes = (check(likeRows) as Row[]).filter((l) => !responded.has(l.actor_user_id));
        const people = await publicProfiles([...new Set(likes.map((l) => l.actor_user_id))]);
        return likes
          .filter((l) => people.has(l.actor_user_id))
          .map<IncomingLike>((l) => {
            let preview: LikedItemPreview = { kind: 'profile' };
            if (l.target_item_type === 'photo') {
              const photo = me?.photos.find((p) => p.id === l.target_item_id);
              if (photo) preview = { kind: 'photo', uri: photo.uri };
            } else if (l.target_item_type === 'prompt') {
              const a = me?.answers.find((x) => x.id === l.target_item_id);
              if (a) preview = { kind: 'prompt', promptText: a.promptText, answer: a.answer };
            }
            return { id: l.id, from: people.get(l.actor_user_id)!, preview, comment: l.comment_text ?? undefined, createdAt: l.created_at };
          });
      },
      async accept(likeId) {
        const matchId = check(await sb().rpc('respond_to_like', { like_id: likeId, accept: true })) as string;
        return { matchId };
      },
      async pass(likeId) {
        check(await sb().rpc('respond_to_like', { like_id: likeId, accept: false }));
      },
    },

    matches: {
      async list() {
        const id = await myId();
        const rows = check(await sb().from('matches').select('*').eq('status', 'active').order('created_at', { ascending: false })) as Row[];
        const otherIds = rows.map((m) => (m.user_a_id === id ? m.user_b_id : m.user_a_id));
        const [people, msgs] = await Promise.all([
          publicProfiles(otherIds),
          rows.length
            ? sb().from('messages').select('match_id, sender_user_id, body, created_at').in('match_id', rows.map((m) => m.id)).order('created_at', { ascending: false }).limit(500)
            : Promise.resolve({ data: [], error: null }),
        ]);
        const last = new Map<string, Row>();
        for (const msg of check(msgs as { data: Row[]; error: PostgrestError | null })) if (!last.has(msg.match_id)) last.set(msg.match_id, msg);
        return rows
          .filter((m) => people.has(m.user_a_id === id ? m.user_b_id : m.user_a_id))
          .map<Match>((m) => {
            const lm = last.get(m.id);
            return {
              id: m.id,
              other: people.get(m.user_a_id === id ? m.user_b_id : m.user_a_id)!,
              createdAt: m.created_at,
              status: m.status,
              lastMessage: lm ? { body: lm.body, createdAt: lm.created_at, fromMe: lm.sender_user_id === id } : undefined,
            };
          })
          .sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt));
      },
      async get(matchId) {
        const id = await myId();
        const m = check(await sb().from('matches').select('*').eq('id', matchId).maybeSingle()) as Row | null;
        if (!m) throw new DataError('not_found', 'This conversation isn’t available.');
        const otherId = m.user_a_id === id ? m.user_b_id : m.user_a_id;
        const other = (await publicProfiles([otherId])).get(otherId) ?? {
          id: otherId, firstName: 'Someone', age: 0, gender: 'nonbinary', broadLocation: '', photos: [], answers: [],
        };
        return { id: m.id, other, createdAt: m.created_at, status: m.status };
      },
      async unmatch(matchId) {
        check(await sb().rpc('unmatch', { m: matchId }));
      },
    },

    messaging: {
      async list(matchId) {
        const rows = check(
          await sb().from('messages').select('id, client_id, match_id, sender_user_id, body, created_at').eq('match_id', matchId).order('created_at').limit(500),
        ) as Row[];
        return rows.map<Message>((r) => ({
          id: r.id, clientId: r.client_id, matchId: r.match_id, senderId: r.sender_user_id, body: r.body, createdAt: r.created_at, delivery: 'sent',
        }));
      },
      async send(matchId, body, clientId) {
        const id = await myId();
        const text = messageBodySchema.parse(body);
        const inserted = await sb()
          .from('messages')
          .insert({ match_id: matchId, sender_user_id: id, client_id: clientId, body: text })
          .select('id, client_id, match_id, sender_user_id, body, created_at')
          .single();
        let row = inserted.data as Row | null;
        if (inserted.error?.code === '23505') {
          row = check(await sb().from('messages').select('id, client_id, match_id, sender_user_id, body, created_at').eq('client_id', clientId).eq('sender_user_id', id).single()) as Row;
        } else if (inserted.error) {
          if (inserted.error.code === '42501') throw new DataError('forbidden', 'This conversation has ended.');
          fail(inserted.error);
        }
        return { id: row!.id, clientId: row!.client_id, matchId: row!.match_id, senderId: row!.sender_user_id, body: row!.body, createdAt: row!.created_at, delivery: 'sent' };
      },
      subscribe(listener) {
        listeners.add(listener);
        if (!channel) {
          channel = sb()
            .channel('hallpass-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
              const matchId = (payload.new as Row).match_id as string;
              listeners.forEach((l) => l({ matchId }));
            })
            .subscribe();
        }
        return () => {
          listeners.delete(listener);
          if (listeners.size === 0 && channel) {
            channel.unsubscribe();
            channel = null;
          }
        };
      },
    },

    safety: {
      async block(userId) {
        check(await sb().rpc('block_user', { target: userId }));
      },
      async report(input) {
        const id = await myId();
        const parsed = reportSchema.parse(input);
        check(
          await sb().from('reports').insert({
            reporter_user_id: id,
            reported_user_id: parsed.reportedUserId,
            message_id: parsed.messageId ?? null,
            reason: parsed.reason,
            details: parsed.details || null,
          }),
        );
        if (parsed.alsoBlock) await repo.safety.block(parsed.reportedUserId);
      },
      async deleteAccount() {
        const id = await myId();
        const { data: files } = await sb().storage.from(BUCKET).list(id, { limit: 100 });
        if (files?.length) await sb().storage.from(BUCKET).remove(files.map((f) => `${id}/${f.name}`));
        check(await sb().rpc('delete_my_account'));
        await sb().auth.signOut({ scope: 'local' });
      },
    },
  };

  return repo;
}
