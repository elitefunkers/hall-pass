export type Gender = 'woman' | 'man' | 'nonbinary';

export type Orientation =
  | 'straight'
  | 'gay'
  | 'lesbian'
  | 'bisexual'
  | 'queer'
  | 'pansexual'
  | 'asexual'
  | 'prefer_not_to_say';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ProfilePhoto {
  id: string;
  uri: string;
  order: number;
  moderationStatus: ModerationStatus;
}

export interface Prompt {
  id: string;
  text: string;
}

export interface PromptAnswer {
  id: string;
  promptId: string;
  promptText: string;
  answer: string;
  order: number;
}

export interface Profile {
  id: string;
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  orientation: Orientation;
  bio?: string;
  broadLocation: string;
  photos: ProfilePhoto[];
  answers: PromptAnswer[];
  isActive: boolean;
}

/** What other people may see. Never carries date of birth, contact details or precise location. */
export interface PublicProfile {
  id: string;
  firstName: string;
  age: number;
  gender: Gender;
  bio?: string;
  broadLocation: string;
  distanceLabel?: string;
  photos: ProfilePhoto[];
  answers: PromptAnswer[];
}

export interface Preferences {
  interestedIn: Gender[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number | null;
}

export interface PrivacySettings {
  showDistance: boolean;
  useDeviceLocation: boolean;
}

/** Rounded to about 5 km on the device before it is stored anywhere. */
export interface CoarseLocation {
  lat: number;
  lng: number;
}

export type LikeTargetType = 'photo' | 'prompt' | 'profile';

export interface LikeTarget {
  type: LikeTargetType;
  itemId?: string;
}

export interface LikeInput {
  targetUserId: string;
  target: LikeTarget;
  comment?: string;
}

export type LikedItemPreview =
  | { kind: 'photo'; uri: string }
  | { kind: 'prompt'; promptText: string; answer: string }
  | { kind: 'profile' };

export interface IncomingLike {
  id: string;
  from: PublicProfile;
  preview: LikedItemPreview;
  comment?: string;
  createdAt: string;
}

export type MatchStatus = 'active' | 'unmatched' | 'blocked';

export interface Match {
  id: string;
  other: PublicProfile;
  createdAt: string;
  status: MatchStatus;
  lastMessage?: { body: string; createdAt: string; fromMe: boolean };
}

export type MessageDeliveryState = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  clientId?: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  delivery: MessageDeliveryState;
}

export type ReportReason =
  | 'fake_profile'
  | 'inappropriate_content'
  | 'harassment'
  | 'scam_or_spam'
  | 'underage'
  | 'safety_concern'
  | 'other';

export interface ReportInput {
  reportedUserId: string;
  messageId?: string;
  reason: ReportReason;
  details?: string;
  alsoBlock: boolean;
}

export interface Session {
  userId: string;
  identifier: string;
  method: 'email' | 'phone';
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface NewProfileInput {
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  orientation: Orientation;
  broadLocation: string;
  bio?: string;
  photoUris: string[];
  answers: { promptId: string; answer: string }[];
  preferences: Preferences;
  coarseLocation?: CoarseLocation | null;
}

export interface ProfileDetailsPatch {
  firstName?: string;
  gender?: Gender;
  orientation?: Orientation;
  broadLocation?: string;
  bio?: string;
}
