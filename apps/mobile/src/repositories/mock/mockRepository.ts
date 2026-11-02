import AsyncStorage from '@react-native-async-storage/async-storage';
import { limits } from '@/config';
import {
  likeCommentSchema,
  messageBodySchema,
  preferencesSchema,
  profileDetailsSchema,
  promptAnswerSchema,
  reportSchema,
} from '@/domain/schemas';
import type {
  Gender,
  IncomingLike,
  LikedItemPreview,
  LikeInput,
  LikeTargetType,
  Match,
  MatchStatus,
  Message,
  Orientation,
  Preferences,
  PrivacySettings,
  CoarseLocation,
  Profile,
  ProfilePhoto,
  PromptAnswer,
  PublicProfile,
  ReportReason,
  Session,
} from '@/types/domain';
import { ageFromDateOfBirth } from '@/utils/age';
import { coarsen } from '@/utils/location';
import { DataError, type DataRepository } from '../types';
import { promptLibrary, samplePhotoUri, sampleUsers } from './seed';

const STORAGE_KEY = 'hallpass.mockdb.v1';
const PAGE_SIZE = 4;

interface StoredUser {
  id: string;
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  orientation: Orientation;
  bio?: string;
  broadLocation: string;
  distanceKm?: number;
  photos: ProfilePhoto[];
  answers: PromptAnswer[];
  isActive: boolean;
  preferences: Preferences;
  privacy: PrivacySettings;
  coarseLocation?: CoarseLocation | null;
  isSample: boolean;
  likesBack?: boolean;
  replies?: string[];
}

interface Interaction {
  id: string;
  actorId: string;
  targetId: string;
  targetType: LikeTargetType;
  itemId?: string;
  action: 'like' | 'pass';
  comment?: string;
  createdAt: string;
  resolved: boolean;
}

interface StoredMatch {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
  status: MatchStatus;
}

interface StoredMessage {
  id: string;
  clientId?: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  moderationStatus: 'pending' | 'approved';
}

interface MockDb {
  version: 1;
  accounts: Record<string, string>;
  session: Session | null;
  pendingCodes: Record<string, { identifier: string; method: Session['method'] }>;
  users: Record<string, StoredUser>;
  interactions: Interaction[];
  matches: StoredMatch[];
  messages: StoredMessage[];
  blocks: { blockerId: string; blockedId: string; createdAt: string }[];
  reports: {
    id: string;
    reporterId: string;
    reportedUserId: string;
    messageId?: string;
    reason: ReportReason;
    details?: string;
    status: 'open' | 'reviewing' | 'actioned' | 'dismissed';
    createdAt: string;
  }[];
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function delay(min = 220, max = 520): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

function seedDb(): MockDb {
  const users: Record<string, StoredUser> = {};
  for (const s of sampleUsers) {
    users[s.id] = {
      id: s.id,
      firstName: s.firstName,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      orientation: s.orientation,
      bio: s.bio,
      broadLocation: s.broadLocation,
      distanceKm: s.distanceKm,
      photos: Array.from({ length: s.photoCount }, (_, i) => ({
        id: `${s.id}-ph${i}`,
        uri: samplePhotoUri(s.id, i),
        order: i,
        moderationStatus: 'approved' as const,
      })),
      answers: s.answers.map(([promptId, answer], i) => ({
        id: `${s.id}-an${i}`,
        promptId,
        promptText: promptLibrary.find((p) => p.id === promptId)?.text ?? '',
        answer,
        order: i,
      })),
      isActive: true,
      preferences: { interestedIn: s.interestedIn, minAge: 18, maxAge: 60, maxDistanceKm: null },
      privacy: { showDistance: true, useDeviceLocation: false },
      isSample: true,
      likesBack: s.likesBack,
      replies: s.replies,
    };
  }
  return {
    version: 1,
    accounts: {},
    session: null,
    pendingCodes: {},
    users,
    interactions: [],
    matches: [],
    messages: [],
    blocks: [],
    reports: [],
  };
}

function privacyOf(u: StoredUser): PrivacySettings {
  return { showDistance: u.privacy.showDistance, useDeviceLocation: Boolean(u.coarseLocation) };
}

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function createMockRepository(): DataRepository {
  let db: MockDb | null = null;
  let loading: Promise<MockDb> | null = null;
  let simulateNetworkErrors = false;
  const listeners = new Set<(event: { matchId: string }) => void>();

  async function load(): Promise<MockDb> {
    if (db) return db;
    if (!loading) {
      loading = (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const parsed = raw ? (JSON.parse(raw) as MockDb) : null;
          db = parsed?.version === 1 ? parsed : seedDb();
        } catch {
          db = seedDb();
        }
        return db;
      })();
    }
    return loading;
  }

  async function save(): Promise<void> {
    if (!db) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage can be unavailable (private browsing); the session keeps working in memory.
    }
  }

  async function begin(): Promise<MockDb> {
    await delay();
    if (simulateNetworkErrors) throw new DataError('network', 'We couldn’t reach Hall Pass. Check your connection and try again.');
    return load();
  }

  function requireMe(d: MockDb): StoredUser {
    const userId = d.session?.userId;
    const me = userId ? d.users[userId] : undefined;
    if (!userId || !me) throw new DataError('forbidden', 'Please sign in again.');
    return me;
  }

  function isBlockedBetween(d: MockDb, a: string, b: string): boolean {
    return d.blocks.some(
      (x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a),
    );
  }

  function findMatch(d: MockDb, a: string, b: string): StoredMatch | undefined {
    const [x, y] = pairKey(a, b);
    return d.matches.find((m) => m.userA === x && m.userB === y);
  }

  function createMatch(d: MockDb, a: string, b: string): StoredMatch {
    const existing = findMatch(d, a, b);
    if (existing) return existing;
    const [userA, userB] = pairKey(a, b);
    const match: StoredMatch = { id: newId('m'), userA, userB, createdAt: nowIso(), status: 'active' };
    d.matches.push(match);
    return match;
  }

  function toPublic(u: StoredUser): PublicProfile {
    let distanceLabel: string | undefined;
    if (u.privacy.showDistance && typeof u.distanceKm === 'number') {
      distanceLabel = u.distanceKm <= 2 ? 'Less than 2 km away' : `About ${Math.round(u.distanceKm)} km away`;
    }
    return {
      id: u.id,
      firstName: u.firstName,
      age: ageFromDateOfBirth(u.dateOfBirth),
      gender: u.gender,
      bio: u.bio,
      broadLocation: u.broadLocation,
      distanceLabel,
      photos: [...u.photos].sort((a, b) => a.order - b.order),
      answers: [...u.answers].sort((a, b) => a.order - b.order),
    };
  }

  function toProfile(u: StoredUser): Profile {
    return {
      id: u.id,
      firstName: u.firstName,
      dateOfBirth: u.dateOfBirth,
      gender: u.gender,
      orientation: u.orientation,
      bio: u.bio,
      broadLocation: u.broadLocation,
      photos: [...u.photos].sort((a, b) => a.order - b.order),
      answers: [...u.answers].sort((a, b) => a.order - b.order),
      isActive: u.isActive,
    };
  }

  function mutuallyEligible(me: StoredUser, other: StoredUser): boolean {
    const otherAge = ageFromDateOfBirth(other.dateOfBirth);
    const myAge = ageFromDateOfBirth(me.dateOfBirth);
    return (
      other.isActive &&
      me.preferences.interestedIn.includes(other.gender) &&
      other.preferences.interestedIn.includes(me.gender) &&
      otherAge >= me.preferences.minAge &&
      otherAge <= me.preferences.maxAge &&
      myAge >= other.preferences.minAge &&
      myAge <= other.preferences.maxAge &&
      (me.preferences.maxDistanceKm == null ||
        other.distanceKm == null ||
        other.distanceKm <= me.preferences.maxDistanceKm)
    );
  }

  function previewFor(owner: StoredUser, type: LikeTargetType, itemId?: string): LikedItemPreview {
    if (type === 'photo') {
      const photo = owner.photos.find((p) => p.id === itemId);
      if (photo) return { kind: 'photo', uri: photo.uri };
    }
    if (type === 'prompt') {
      const answer = owner.answers.find((a) => a.id === itemId);
      if (answer) return { kind: 'prompt', promptText: answer.promptText, answer: answer.answer };
    }
    return { kind: 'profile' };
  }

  /** Gives a brand-new account a few people who already liked them, so every flow can be tried. */
  function seedIncomingLikes(d: MockDb, me: StoredUser): void {
    const likers = sampleUsers
      .filter((s) => s.likeComment && mutuallyEligible(me, d.users[s.id]))
      .slice(0, 3);
    likers.forEach((s, index) => {
      const isPrompt = index % 2 === 0 && me.answers.length > 0;
      const target = isPrompt ? me.answers[index % me.answers.length] : me.photos[index % Math.max(me.photos.length, 1)];
      d.interactions.push({
        id: newId('i'),
        actorId: s.id,
        targetId: me.id,
        targetType: target ? (isPrompt ? 'prompt' : 'photo') : 'profile',
        itemId: target?.id,
        action: 'like',
        comment: s.likeComment,
        createdAt: new Date(Date.now() - (index + 1) * 47 * 60000).toISOString(),
        resolved: false,
      });
    });
  }

  function scheduleReply(matchId: string, fromId: string, myId: string): void {
    setTimeout(async () => {
      const d = await load();
      const match = d.matches.find((m) => m.id === matchId);
      const sample = d.users[fromId];
      if (!match || match.status !== 'active' || !sample?.replies || isBlockedBetween(d, fromId, myId)) return;
      const alreadySent = d.messages.filter((m) => m.matchId === matchId && m.senderId === fromId).length;
      const reply = sample.replies[alreadySent];
      if (!reply) return;
      d.messages.push({ id: newId('msg'), matchId, senderId: fromId, body: reply, createdAt: nowIso(), moderationStatus: 'approved' });
      await save();
      listeners.forEach((l) => l({ matchId }));
    }, 2400);
  }

  function updateMe(d: MockDb, change: (me: StoredUser) => void): Profile {
    const me = requireMe(d);
    change(me);
    return toProfile(me);
  }

  const repo: DataRepository = {
    auth: {
      async getSession() {
        const d = await load();
        return d.session;
      },
      async requestCode(method, identifier) {
        const d = await begin();
        const verificationId = newId('v');
        d.pendingCodes[verificationId] = { method, identifier: identifier.trim().toLowerCase() };
        await save();
        return { verificationId };
      },
      async verifyCode(verificationId, code) {
        const d = await begin();
        const pending = d.pendingCodes[verificationId];
        if (!pending) throw new DataError('invalid', 'That code has expired. Request a new one.');
        if (!/^\d{6}$/.test(code)) throw new DataError('invalid', 'That code isn’t right. Check it and try again.');
        delete d.pendingCodes[verificationId];
        const userId = d.accounts[pending.identifier] ?? newId('u');
        d.accounts[pending.identifier] = userId;
        d.session = { userId, identifier: pending.identifier, method: pending.method };
        await save();
        return d.session;
      },
      async signOut() {
        const d = await load();
        d.session = null;
        await save();
      },
    },

    profile: {
      async getMine() {
        const d = await begin();
        const userId = d.session?.userId;
        const me = userId ? d.users[userId] : undefined;
        return me ? toProfile(me) : null;
      },
      async create(input) {
        const d = await begin();
        const userId = d.session?.userId;
        if (!userId) throw new DataError('forbidden', 'Please sign in again.');
        const details = profileDetailsSchema.safeParse(input);
        if (!details.success) throw new DataError('invalid', details.error.issues[0]?.message ?? 'Check your details.');
        const prefs = preferencesSchema.safeParse(input.preferences);
        if (!prefs.success) throw new DataError('invalid', prefs.error.issues[0]?.message ?? 'Check your preferences.');
        if (input.photoUris.length < limits.minPhotos) throw new DataError('invalid', `Add at least ${limits.minPhotos} photos.`);
        if (input.answers.length < limits.minPrompts) throw new DataError('invalid', `Answer ${limits.minPrompts} prompts.`);
        const me: StoredUser = {
          id: userId,
          firstName: details.data.firstName,
          dateOfBirth: details.data.dateOfBirth,
          gender: details.data.gender,
          orientation: details.data.orientation,
          broadLocation: details.data.broadLocation,
          bio: input.bio,
          photos: input.photoUris.slice(0, limits.maxPhotos).map((uri, i) => ({
            id: newId('ph'),
            uri,
            order: i,
            moderationStatus: 'pending',
          })),
          answers: input.answers.map((a, i) => ({
            id: newId('an'),
            promptId: a.promptId,
            promptText: promptLibrary.find((p) => p.id === a.promptId)?.text ?? '',
            answer: promptAnswerSchema.parse(a.answer),
            order: i,
          })),
          isActive: true,
          preferences: prefs.data,
          privacy: { showDistance: true, useDeviceLocation: false },
          coarseLocation: input.coarseLocation ? coarsen(input.coarseLocation) : null,
          isSample: false,
        };
        d.users[userId] = me;
        seedIncomingLikes(d, me);
        await save();
        return toProfile(me);
      },
      async updateDetails(patch) {
        const d = await begin();
        const me = requireMe(d);
        const merged = { ...toProfile(me), ...patch };
        const parsed = profileDetailsSchema.safeParse(merged);
        if (!parsed.success) throw new DataError('invalid', parsed.error.issues[0]?.message ?? 'Check your details.');
        const bio = patch.bio !== undefined ? patch.bio.trim().slice(0, limits.bio) : me.bio;
        const profile = updateMe(d, (u) => Object.assign(u, parsed.data, { bio: bio || undefined }));
        await save();
        return profile;
      },
      async addPhoto(uri) {
        const d = await begin();
        const me = requireMe(d);
        if (me.photos.length >= limits.maxPhotos) throw new DataError('invalid', `You can have up to ${limits.maxPhotos} photos.`);
        const profile = updateMe(d, (u) =>
          u.photos.push({ id: newId('ph'), uri, order: u.photos.length, moderationStatus: 'pending' }),
        );
        await save();
        return profile;
      },
      async removePhoto(photoId) {
        const d = await begin();
        const me = requireMe(d);
        if (me.photos.length <= limits.minPhotos) throw new DataError('invalid', `Keep at least ${limits.minPhotos} photos on your profile.`);
        const profile = updateMe(d, (u) => {
          u.photos = u.photos.filter((p) => p.id !== photoId).map((p, i) => ({ ...p, order: i }));
        });
        await save();
        return profile;
      },
      async reorderPhotos(photoIds) {
        const d = await begin();
        const me = requireMe(d);
        const known = new Set(me.photos.map((p) => p.id));
        if (photoIds.length !== known.size || !photoIds.every((id) => known.has(id))) {
          throw new DataError('invalid', 'Photo order is out of date. Refresh and try again.');
        }
        const profile = updateMe(d, (u) => {
          u.photos = photoIds.map((id, i) => ({ ...u.photos.find((p) => p.id === id)!, order: i }));
        });
        await save();
        return profile;
      },
      async saveAnswers(answers) {
        const d = await begin();
        if (answers.length < limits.minPrompts) throw new DataError('invalid', `Keep ${limits.minPrompts} prompts on your profile.`);
        const profile = updateMe(d, (u) => {
          u.answers = answers.map((a, i) => {
            const existing = u.answers.find((x) => x.promptId === a.promptId);
            return {
              id: existing?.id ?? newId('an'),
              promptId: a.promptId,
              promptText: promptLibrary.find((p) => p.id === a.promptId)?.text ?? '',
              answer: promptAnswerSchema.parse(a.answer),
              order: i,
            };
          });
        });
        await save();
        return profile;
      },
      async setActive(isActive) {
        const d = await begin();
        const profile = updateMe(d, (u) => {
          u.isActive = isActive;
        });
        await save();
        return profile;
      },
      async getPromptLibrary() {
        await delay(80, 160);
        return promptLibrary;
      },
      async getPreferences() {
        const d = await begin();
        return requireMe(d).preferences;
      },
      async savePreferences(preferences) {
        const d = await begin();
        const parsed = preferencesSchema.safeParse(preferences);
        if (!parsed.success) throw new DataError('invalid', parsed.error.issues[0]?.message ?? 'Check your preferences.');
        requireMe(d).preferences = parsed.data;
        await save();
        return parsed.data;
      },
      async getPrivacy() {
        const d = await begin();
        return privacyOf(requireMe(d));
      },
      async savePrivacy(settings) {
        const d = await begin();
        const me = requireMe(d);
        me.privacy = { ...privacyOf(me), showDistance: Boolean(settings.showDistance) };
        await save();
        return privacyOf(me);
      },
      async updateLocation(location) {
        const d = await begin();
        const me = requireMe(d);
        me.coarseLocation = location ? coarsen(location) : null;
        await save();
        return privacyOf(me);
      },
    },

    discovery: {
      async getSuggested(cursor) {
        const d = await begin();
        const me = requireMe(d);
        const touched = new Set(d.interactions.filter((i) => i.actorId === me.id).map((i) => i.targetId));
        const eligible = Object.values(d.users).filter(
          (u) =>
            u.id !== me.id &&
            u.isSample &&
            !touched.has(u.id) &&
            !findMatch(d, me.id, u.id) &&
            !isBlockedBetween(d, me.id, u.id) &&
            mutuallyEligible(me, u),
        );
        const offset = cursor ? Number(cursor) : 0;
        const items = eligible.slice(offset, offset + PAGE_SIZE).map(toPublic);
        const next = offset + PAGE_SIZE < eligible.length ? String(offset + PAGE_SIZE) : null;
        return { items, nextCursor: next };
      },
      async getProfile(userId) {
        const d = await begin();
        const me = requireMe(d);
        const other = d.users[userId];
        if (!other || other.id === me.id || isBlockedBetween(d, me.id, userId)) {
          throw new DataError('not_found', 'This profile isn’t available.');
        }
        return toPublic(other);
      },
      async like(input: LikeInput) {
        const d = await begin();
        const me = requireMe(d);
        const target = d.users[input.targetUserId];
        if (!target || target.id === me.id || isBlockedBetween(d, me.id, target.id)) {
          throw new DataError('not_found', 'This profile isn’t available any more.');
        }
        const comment = likeCommentSchema.parse(input.comment);
        if (input.target.type !== 'profile') {
          const exists =
            input.target.type === 'photo'
              ? target.photos.some((p) => p.id === input.target.itemId)
              : target.answers.some((a) => a.id === input.target.itemId);
          if (!exists) throw new DataError('invalid', 'That photo or prompt was changed. Try again.');
        }
        const duplicate = d.interactions.find((i) => i.actorId === me.id && i.targetId === target.id);
        if (duplicate) throw new DataError('conflict', `You’ve already responded to ${target.firstName}.`);

        d.interactions.push({
          id: newId('i'),
          actorId: me.id,
          targetId: target.id,
          targetType: input.target.type,
          itemId: input.target.itemId,
          action: 'like',
          comment: comment || undefined,
          createdAt: nowIso(),
          resolved: false,
        });

        const theirLike = d.interactions.find(
          (i) => i.actorId === target.id && i.targetId === me.id && i.action === 'like' && !i.resolved,
        );
        let matchId: string | null = null;
        if (theirLike || target.likesBack) {
          if (theirLike) theirLike.resolved = true;
          matchId = createMatch(d, me.id, target.id).id;
        }
        await save();
        return { matchId };
      },
      async pass(userId) {
        const d = await begin();
        const me = requireMe(d);
        if (d.interactions.some((i) => i.actorId === me.id && i.targetId === userId)) return;
        d.interactions.push({
          id: newId('i'), actorId: me.id, targetId: userId, targetType: 'profile', action: 'pass', createdAt: nowIso(), resolved: true,
        });
        await save();
      },
      async undoPass(userId) {
        const d = await begin();
        const me = requireMe(d);
        d.interactions = d.interactions.filter(
          (i) => !(i.actorId === me.id && i.targetId === userId && i.action === 'pass'),
        );
        await save();
      },
    },

    likes: {
      async getIncoming() {
        const d = await begin();
        const me = requireMe(d);
        const myResponses = new Set(d.interactions.filter((i) => i.actorId === me.id).map((i) => i.targetId));
        return d.interactions
          .filter(
            (i) =>
              i.targetId === me.id &&
              i.action === 'like' &&
              !i.resolved &&
              !myResponses.has(i.actorId) &&
              !findMatch(d, me.id, i.actorId) &&
              !isBlockedBetween(d, me.id, i.actorId) &&
              d.users[i.actorId]?.isActive,
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map<IncomingLike>((i) => ({
            id: i.id,
            from: toPublic(d.users[i.actorId]),
            preview: previewFor(me, i.targetType, i.itemId),
            comment: i.comment,
            createdAt: i.createdAt,
          }));
      },
      async accept(likeId) {
        const d = await begin();
        const me = requireMe(d);
        const like = d.interactions.find((i) => i.id === likeId && i.targetId === me.id && i.action === 'like');
        if (!like || like.resolved) throw new DataError('not_found', 'This like is no longer available.');
        if (isBlockedBetween(d, me.id, like.actorId)) throw new DataError('forbidden', 'This person isn’t available.');
        like.resolved = true;
        d.interactions.push({
          id: newId('i'), actorId: me.id, targetId: like.actorId, targetType: 'profile', action: 'like', createdAt: nowIso(), resolved: true,
        });
        const match = createMatch(d, me.id, like.actorId);
        await save();
        return { matchId: match.id };
      },
      async pass(likeId) {
        const d = await begin();
        const me = requireMe(d);
        const like = d.interactions.find((i) => i.id === likeId && i.targetId === me.id);
        if (!like) return;
        like.resolved = true;
        d.interactions.push({
          id: newId('i'), actorId: me.id, targetId: like.actorId, targetType: 'profile', action: 'pass', createdAt: nowIso(), resolved: true,
        });
        await save();
      },
    },

    matches: {
      async list() {
        const d = await begin();
        const me = requireMe(d);
        return d.matches
          .filter((m) => m.status === 'active' && (m.userA === me.id || m.userB === me.id))
          .map((m) => toMatch(d, m, me.id))
          .sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt));
      },
      async get(matchId) {
        const d = await begin();
        const me = requireMe(d);
        const m = d.matches.find((x) => x.id === matchId && (x.userA === me.id || x.userB === me.id));
        if (!m) throw new DataError('not_found', 'This conversation isn’t available.');
        return toMatch(d, m, me.id);
      },
      async unmatch(matchId) {
        const d = await begin();
        const me = requireMe(d);
        const m = d.matches.find((x) => x.id === matchId && (x.userA === me.id || x.userB === me.id));
        if (!m) throw new DataError('not_found', 'This match isn’t available.');
        m.status = 'unmatched';
        await save();
      },
    },

    messaging: {
      async list(matchId) {
        const d = await begin();
        const me = requireMe(d);
        const m = d.matches.find((x) => x.id === matchId && (x.userA === me.id || x.userB === me.id));
        if (!m) throw new DataError('forbidden', 'You can only read conversations you’re part of.');
        return d.messages
          .filter((x) => x.matchId === matchId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map<Message>((x) => ({ ...x, delivery: 'sent' }));
      },
      async send(matchId, body, clientId) {
        const d = await begin();
        const me = requireMe(d);
        const m = d.matches.find((x) => x.id === matchId && (x.userA === me.id || x.userB === me.id));
        if (!m) throw new DataError('forbidden', 'You can only message your matches.');
        const otherId = m.userA === me.id ? m.userB : m.userA;
        if (m.status !== 'active' || isBlockedBetween(d, me.id, otherId)) {
          throw new DataError('forbidden', 'This conversation has ended.');
        }
        const existing = d.messages.find((x) => x.clientId === clientId && x.senderId === me.id);
        if (existing) return { ...existing, delivery: 'sent' };
        const text = messageBodySchema.parse(body);
        const stored: StoredMessage = {
          id: newId('msg'), clientId, matchId, senderId: me.id, body: text, createdAt: nowIso(), moderationStatus: 'approved',
        };
        d.messages.push(stored);
        await save();
        if (d.users[otherId]?.isSample) scheduleReply(matchId, otherId, me.id);
        return { ...stored, delivery: 'sent' };
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },

    safety: {
      async block(userId) {
        const d = await begin();
        const me = requireMe(d);
        if (userId === me.id) throw new DataError('invalid', 'You can’t block yourself.');
        if (!isBlockedBetween(d, me.id, userId)) {
          d.blocks.push({ blockerId: me.id, blockedId: userId, createdAt: nowIso() });
        }
        const m = findMatch(d, me.id, userId);
        if (m) m.status = 'blocked';
        d.interactions.forEach((i) => {
          if (i.actorId === userId && i.targetId === me.id) i.resolved = true;
        });
        await save();
      },
      async report(input) {
        const d = await begin();
        const me = requireMe(d);
        const parsed = reportSchema.parse(input);
        d.reports.push({
          id: newId('r'),
          reporterId: me.id,
          reportedUserId: parsed.reportedUserId,
          messageId: parsed.messageId,
          reason: parsed.reason,
          details: parsed.details || undefined,
          status: 'open',
          createdAt: nowIso(),
        });
        await save();
        if (parsed.alsoBlock) await repo.safety.block(parsed.reportedUserId);
      },
      async deleteAccount() {
        const d = await begin();
        const me = requireMe(d);
        const matchIds = new Set(d.matches.filter((m) => m.userA === me.id || m.userB === me.id).map((m) => m.id));
        delete d.users[me.id];
        d.interactions = d.interactions.filter((i) => i.actorId !== me.id && i.targetId !== me.id);
        d.matches = d.matches.filter((m) => !matchIds.has(m.id));
        d.messages = d.messages.filter((x) => !matchIds.has(x.matchId));
        d.blocks = d.blocks.filter((b) => b.blockerId !== me.id && b.blockedId !== me.id);
        for (const [identifier, userId] of Object.entries(d.accounts)) {
          if (userId === me.id) delete d.accounts[identifier];
        }
        d.session = null;
        await save();
      },
    },

    dev: {
      setSimulateNetworkErrors(enabled) {
        simulateNetworkErrors = enabled;
      },
      getSimulateNetworkErrors() {
        return simulateNetworkErrors;
      },
      async reset() {
        db = seedDb();
        loading = Promise.resolve(db);
        await save();
      },
    },
  };

  function toMatch(d: MockDb, m: StoredMatch, myId: string): Match {
    const otherId = m.userA === myId ? m.userB : m.userA;
    const last = d.messages
      .filter((x) => x.matchId === m.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      id: m.id,
      other: toPublic(d.users[otherId]),
      createdAt: m.createdAt,
      status: m.status,
      lastMessage: last ? { body: last.body, createdAt: last.createdAt, fromMe: last.senderId === myId } : undefined,
    };
  }

  return repo;
}
