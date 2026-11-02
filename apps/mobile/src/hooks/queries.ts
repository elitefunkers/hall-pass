import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  DiscoveryService,
  LikesService,
  MatchesService,
  MessagingService,
  ProfileService,
  SafetyService,
} from '@/services';
import type { CoarseLocation, LikeInput, Message, Page, Preferences, PrivacySettings, ProfileDetailsPatch, PublicProfile, ReportInput } from '@/types/domain';

export const keys = {
  me: ['me'] as const,
  prompts: ['prompts'] as const,
  preferences: ['preferences'] as const,
  privacy: ['privacy'] as const,
  discover: ['discover'] as const,
  person: (id: string) => ['person', id] as const,
  likes: ['likes'] as const,
  matches: ['matches'] as const,
  match: (id: string) => ['match', id] as const,
  messages: (id: string) => ['messages', id] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: keys.me, queryFn: ProfileService.getMyProfile });
}

export function usePromptLibrary() {
  return useQuery({ queryKey: keys.prompts, queryFn: ProfileService.getPromptLibrary, staleTime: Infinity });
}

export function usePreferences() {
  return useQuery({ queryKey: keys.preferences, queryFn: ProfileService.getPreferences });
}

export function usePrivacy() {
  return useQuery({ queryKey: keys.privacy, queryFn: ProfileService.getPrivacy });
}

export function useProfileMutations() {
  const qc = useQueryClient();
  const setMe = (profile: Awaited<ReturnType<typeof ProfileService.getMyProfile>>) => qc.setQueryData(keys.me, profile);
  return {
    updateDetails: useMutation({ mutationFn: (p: ProfileDetailsPatch) => ProfileService.updateMyProfile(p), onSuccess: setMe }),
    addPhoto: useMutation({ mutationFn: (uri: string) => ProfileService.uploadPhoto(uri), onSuccess: setMe }),
    removePhoto: useMutation({ mutationFn: (id: string) => ProfileService.removePhoto(id), onSuccess: setMe }),
    reorderPhotos: useMutation({ mutationFn: (ids: string[]) => ProfileService.reorderPhotos(ids), onSuccess: setMe }),
    saveAnswers: useMutation({
      mutationFn: (answers: { promptId: string; answer: string }[]) => ProfileService.savePromptAnswers(answers),
      onSuccess: setMe,
    }),
    setActive: useMutation({ mutationFn: (active: boolean) => ProfileService.setProfileActive(active), onSuccess: setMe }),
    savePreferences: useMutation({
      mutationFn: (p: Preferences) => ProfileService.savePreferences(p),
      onSuccess: (p) => {
        qc.setQueryData(keys.preferences, p);
        qc.invalidateQueries({ queryKey: keys.discover });
      },
    }),
    savePrivacy: useMutation({
      mutationFn: (p: Pick<PrivacySettings, 'showDistance'>) => ProfileService.savePrivacy(p),
      onSuccess: (p) => qc.setQueryData(keys.privacy, p),
    }),
    updateLocation: useMutation({
      mutationFn: (location: CoarseLocation | null) => ProfileService.updateLocation(location),
      onSuccess: (p) => {
        qc.setQueryData(keys.privacy, p);
        qc.invalidateQueries({ queryKey: keys.discover });
      },
    }),
  };
}

type DiscoverData = InfiniteData<Page<PublicProfile>, string | undefined>;

export function useDiscoverFeed() {
  return useInfiniteQuery({
    queryKey: keys.discover,
    queryFn: ({ pageParam }) => DiscoveryService.getSuggestedProfiles(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

function removeFromDiscover(qc: ReturnType<typeof useQueryClient>, userId: string) {
  qc.setQueryData<DiscoverData>(keys.discover, (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((u) => u.id !== userId) })) }
      : data,
  );
}

export function useLikeProfileItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LikeInput) => DiscoveryService.likeProfileItem(input),
    onSuccess: (result, input) => {
      removeFromDiscover(qc, input.targetUserId);
      qc.invalidateQueries({ queryKey: keys.likes });
      if (result.matchId) qc.invalidateQueries({ queryKey: keys.matches });
    },
  });
}

export function usePassProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => DiscoveryService.passProfile(userId),
    onSuccess: (_r, userId) => removeFromDiscover(qc, userId),
  });
}

export function useUndoPass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => DiscoveryService.undoPass(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.discover }),
  });
}

export function usePerson(userId: string) {
  return useQuery({ queryKey: keys.person(userId), queryFn: () => DiscoveryService.getProfile(userId), enabled: !!userId });
}

export function useIncomingLikes() {
  return useQuery({ queryKey: keys.likes, queryFn: LikesService.getIncomingLikes });
}

export function useRespondToLike() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.likes });
    qc.invalidateQueries({ queryKey: keys.discover });
  };
  return {
    accept: useMutation({
      mutationFn: (likeId: string) => LikesService.acceptLike(likeId),
      onSuccess: () => {
        refresh();
        qc.invalidateQueries({ queryKey: keys.matches });
      },
    }),
    pass: useMutation({ mutationFn: (likeId: string) => LikesService.passLike(likeId), onSuccess: refresh }),
  };
}

export function useMatches() {
  return useQuery({ queryKey: keys.matches, queryFn: MatchesService.getMatches });
}

export function useMatch(matchId: string) {
  return useQuery({ queryKey: keys.match(matchId), queryFn: () => MatchesService.getMatch(matchId), enabled: !!matchId });
}

export function useMessages(matchId: string) {
  const qc = useQueryClient();
  useEffect(
    () =>
      MessagingService.subscribe((event) => {
        if (event.matchId !== matchId) return;
        qc.invalidateQueries({ queryKey: keys.messages(matchId) });
        qc.invalidateQueries({ queryKey: keys.matches });
      }),
    [matchId, qc],
  );
  return useQuery({ queryKey: keys.messages(matchId), queryFn: () => MessagingService.getMessages(matchId), enabled: !!matchId });
}

export function useSendMessage(matchId: string, myUserId: string) {
  const qc = useQueryClient();
  const key = keys.messages(matchId);
  const patch = (clientId: string, change: (m: Message) => Message | null) =>
    qc.setQueryData<Message[]>(key, (list) =>
      (list ?? []).flatMap((m) => {
        if (m.clientId !== clientId) return [m];
        const next = change(m);
        return next ? [next] : [];
      }),
    );

  return useMutation({
    mutationFn: (vars: { body: string; clientId: string }) => MessagingService.sendMessage(matchId, vars.body, vars.clientId),
    onMutate: ({ body, clientId }) => {
      const existing = qc.getQueryData<Message[]>(key)?.some((m) => m.clientId === clientId);
      if (existing) {
        patch(clientId, (m) => ({ ...m, delivery: 'sending' }));
      } else {
        qc.setQueryData<Message[]>(key, (list) => [
          ...(list ?? []),
          { id: clientId, clientId, matchId, senderId: myUserId, body, createdAt: new Date().toISOString(), delivery: 'sending' },
        ]);
      }
    },
    onSuccess: (saved, { clientId }) => {
      patch(clientId, () => saved);
      qc.invalidateQueries({ queryKey: keys.matches });
    },
    onError: (_e, { clientId }) => patch(clientId, (m) => ({ ...m, delivery: 'failed' })),
  });
}

export function useSafetyActions() {
  const qc = useQueryClient();
  const refreshAll = () => {
    for (const key of [keys.discover, keys.likes, keys.matches]) qc.invalidateQueries({ queryKey: key });
  };
  return {
    block: useMutation({ mutationFn: (userId: string) => SafetyService.blockUser(userId), onSuccess: refreshAll }),
    report: useMutation({ mutationFn: (input: ReportInput) => SafetyService.reportUser(input), onSuccess: refreshAll }),
    unmatch: useMutation({ mutationFn: (matchId: string) => MatchesService.unmatch(matchId), onSuccess: refreshAll }),
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Try again.';
}
