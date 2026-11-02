import type {
  CoarseLocation,
  IncomingLike,
  LikeInput,
  Match,
  Message,
  NewProfileInput,
  Page,
  Preferences,
  PrivacySettings,
  Profile,
  ProfileDetailsPatch,
  Prompt,
  PublicProfile,
  ReportInput,
  Session,
} from '@/types/domain';

export class DataError extends Error {
  constructor(
    public readonly code: 'network' | 'not_found' | 'forbidden' | 'invalid' | 'conflict',
    message: string,
  ) {
    super(message);
    this.name = 'DataError';
  }
}

/**
 * The single contract between the app and its backend. The mock adapter runs
 * fully on-device; a Supabase adapter implements the same interface.
 */
export interface DataRepository {
  auth: {
    getSession(): Promise<Session | null>;
    requestCode(method: Session['method'], identifier: string): Promise<{ verificationId: string }>;
    verifyCode(verificationId: string, code: string): Promise<Session>;
    signOut(): Promise<void>;
  };
  profile: {
    getMine(): Promise<Profile | null>;
    create(input: NewProfileInput): Promise<Profile>;
    updateDetails(patch: ProfileDetailsPatch): Promise<Profile>;
    addPhoto(uri: string): Promise<Profile>;
    removePhoto(photoId: string): Promise<Profile>;
    reorderPhotos(photoIds: string[]): Promise<Profile>;
    saveAnswers(answers: { promptId: string; answer: string }[]): Promise<Profile>;
    setActive(isActive: boolean): Promise<Profile>;
    getPromptLibrary(): Promise<Prompt[]>;
    getPreferences(): Promise<Preferences>;
    savePreferences(preferences: Preferences): Promise<Preferences>;
    getPrivacy(): Promise<PrivacySettings>;
    savePrivacy(settings: Pick<PrivacySettings, 'showDistance'>): Promise<PrivacySettings>;
    /** Pass null to stop using device location; distances then fall back to hidden. */
    updateLocation(location: CoarseLocation | null): Promise<PrivacySettings>;
  };
  discovery: {
    getSuggested(cursor?: string): Promise<Page<PublicProfile>>;
    getProfile(userId: string): Promise<PublicProfile>;
    like(input: LikeInput): Promise<{ matchId: string | null }>;
    pass(userId: string): Promise<void>;
    undoPass(userId: string): Promise<void>;
  };
  likes: {
    getIncoming(): Promise<IncomingLike[]>;
    accept(likeId: string): Promise<{ matchId: string }>;
    pass(likeId: string): Promise<void>;
  };
  matches: {
    list(): Promise<Match[]>;
    get(matchId: string): Promise<Match>;
    unmatch(matchId: string): Promise<void>;
  };
  messaging: {
    list(matchId: string): Promise<Message[]>;
    send(matchId: string, body: string, clientId: string): Promise<Message>;
    subscribe(listener: (event: { matchId: string }) => void): () => void;
  };
  safety: {
    block(userId: string): Promise<void>;
    report(input: ReportInput): Promise<void>;
    deleteAccount(): Promise<void>;
  };
  dev?: {
    setSimulateNetworkErrors(enabled: boolean): void;
    getSimulateNetworkErrors(): boolean;
    reset(): Promise<void>;
  };
}
