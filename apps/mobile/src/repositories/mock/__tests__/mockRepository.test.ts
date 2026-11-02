import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createMockRepository } from '../mockRepository';
import type { DataRepository } from '../../types';
import type { NewProfileInput } from '@/types/domain';

jest.useFakeTimers();

/** Mock latency uses setTimeout; advance timers while each call is in flight. */
async function run<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  promise.then(() => (settled = true), () => (settled = true));
  while (!settled) {
    await jest.advanceTimersByTimeAsync(600);
  }
  return promise;
}

const newProfile: NewProfileInput = {
  firstName: 'Alex',
  dateOfBirth: '1995-06-15',
  gender: 'man',
  orientation: 'straight',
  broadLocation: 'Riverside',
  photoUris: ['file:///a.jpg', 'file:///b.jpg'],
  answers: [
    { promptId: 'p01', answer: 'Coffee and a long walk.' },
    { promptId: 'p03', answer: 'Old maps of the city.' },
    { promptId: 'p07', answer: 'Sourdough, still failing.' },
  ],
  preferences: { interestedIn: ['woman'], minAge: 21, maxAge: 40, maxDistanceKm: null },
};

async function signedInWithProfile(repo: DataRepository, identifier = 'alex@example.com') {
  const { verificationId } = await run(repo.auth.requestCode('email', identifier));
  const session = await run(repo.auth.verifyCode(verificationId, '123456'));
  await run(repo.profile.create(newProfile));
  return session;
}

describe('mock repository rules', () => {
  let repo: DataRepository;

  beforeEach(async () => {
    repo = createMockRepository();
    await run(repo.dev!.reset());
  });

  it('only suggests mutually eligible people and never the current user', async () => {
    const session = await signedInWithProfile(repo);
    const page = await run(repo.discovery.getSuggested());
    expect(page.items.length).toBeGreaterThan(0);
    for (const p of page.items) {
      expect(p.id).not.toBe(session.userId);
      expect(p.gender).toBe('woman');
      expect(p.age).toBeGreaterThanOrEqual(21);
      expect(p.age).toBeLessThanOrEqual(40);
      expect(p).not.toHaveProperty('dateOfBirth');
    }
  });

  it('rejects a duplicate like and creates exactly one match for mutual interest', async () => {
    await signedInWithProfile(repo);
    const target = (await run(repo.discovery.getSuggested())).items.find((p) => p.id === 's-amara')!;
    const result = await run(
      repo.discovery.like({ targetUserId: target.id, target: { type: 'photo', itemId: target.photos[0].id }, comment: 'Hi!' }),
    );
    expect(result.matchId).toBeTruthy();
    await expect(run(repo.discovery.like({ targetUserId: target.id, target: { type: 'profile' } }))).rejects.toMatchObject({
      code: 'conflict',
    });
    const matches = await run(repo.matches.list());
    expect(matches.filter((m) => m.other.id === target.id)).toHaveLength(1);
  });

  it('accepting an incoming like creates a match and removes it from the inbox', async () => {
    await signedInWithProfile(repo);
    const likes = await run(repo.likes.getIncoming());
    expect(likes.length).toBeGreaterThan(0);
    const { matchId } = await run(repo.likes.accept(likes[0].id));
    expect(matchId).toBeTruthy();
    const after = await run(repo.likes.getIncoming());
    expect(after.find((l) => l.id === likes[0].id)).toBeUndefined();
  });

  it('lets match participants message, and stops messaging after block', async () => {
    await signedInWithProfile(repo);
    const likes = await run(repo.likes.getIncoming());
    const otherId = likes[0].from.id;
    const { matchId } = await run(repo.likes.accept(likes[0].id));

    const sent = await run(repo.messaging.send(matchId, 'Hello there', 'client-1'));
    expect(sent.body).toBe('Hello there');
    const again = await run(repo.messaging.send(matchId, 'Hello there', 'client-1'));
    expect(again.id).toBe(sent.id);

    await run(repo.safety.block(otherId));
    await expect(run(repo.messaging.send(matchId, 'Still there?', 'client-2'))).rejects.toMatchObject({ code: 'forbidden' });
    const suggested = await run(repo.discovery.getSuggested());
    expect(suggested.items.find((p) => p.id === otherId)).toBeUndefined();
    await expect(run(repo.discovery.getProfile(otherId))).rejects.toMatchObject({ code: 'not_found' });
  });

  it('refuses to read a conversation the user is not part of', async () => {
    await signedInWithProfile(repo);
    await expect(run(repo.messaging.list('m-someone-elses'))).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('rejects under-18 profiles', async () => {
    const { verificationId } = await run(repo.auth.requestCode('email', 'teen@example.com'));
    await run(repo.auth.verifyCode(verificationId, '123456'));
    const thisYear = new Date().getFullYear();
    await expect(run(repo.profile.create({ ...newProfile, dateOfBirth: `${thisYear - 16}-01-01` }))).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('passing then undoing brings a profile back', async () => {
    await signedInWithProfile(repo);
    const first = (await run(repo.discovery.getSuggested())).items[0];
    await run(repo.discovery.pass(first.id));
    expect((await run(repo.discovery.getSuggested())).items.find((p) => p.id === first.id)).toBeUndefined();
    await run(repo.discovery.undoPass(first.id));
    expect((await run(repo.discovery.getSuggested())).items.find((p) => p.id === first.id)).toBeDefined();
  });

  it('deleting the account removes the profile and signs out', async () => {
    await signedInWithProfile(repo);
    await run(repo.safety.deleteAccount());
    expect(await run(repo.auth.getSession())).toBeNull();
  });
});
