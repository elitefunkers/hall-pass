import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CoarseLocation, Gender, Orientation, Preferences, Session } from '@/types/domain';

export interface OnboardingDraft {
  firstName: string;
  dateOfBirth: string;
  gender: Gender | null;
  orientation: Orientation | null;
  broadLocation: string;
  coarseLocation: CoarseLocation | null;
  preferences: Preferences;
  photoUris: string[];
  answers: { promptId: string; answer: string }[];
}

export const emptyDraft: OnboardingDraft = {
  firstName: '',
  dateOfBirth: '',
  gender: null,
  orientation: null,
  broadLocation: '',
  coarseLocation: null,
  preferences: { interestedIn: [], minAge: 24, maxAge: 38, maxDistanceKm: null },
  photoUris: [],
  answers: [],
};

interface SessionState {
  ageConfirmed: boolean;
  session: Session | null;
  hasProfile: boolean;
  draft: OnboardingDraft;
  confirmAge: () => void;
  signedIn: (session: Session, hasProfile: boolean) => void;
  profilePublished: () => void;
  signedOut: () => void;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ageConfirmed: false,
      session: null,
      hasProfile: false,
      draft: emptyDraft,
      confirmAge: () => set({ ageConfirmed: true }),
      signedIn: (session, hasProfile) => set({ session, hasProfile }),
      profilePublished: () => set({ hasProfile: true, draft: emptyDraft }),
      signedOut: () => set({ session: null, hasProfile: false, draft: emptyDraft }),
      updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
    }),
    {
      name: 'hallpass.session.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ ageConfirmed: s.ageConfirmed, session: s.session, hasProfile: s.hasProfile, draft: s.draft }),
    },
  ),
);
