import { repository } from '@/repositories';
import type { CoarseLocation, LikeInput, NewProfileInput, Preferences, PrivacySettings, ProfileDetailsPatch, ReportInput, Session } from '@/types/domain';

export const AuthService = {
  requestCode: (method: Session['method'], identifier: string) => repository.auth.requestCode(method, identifier),
  verifyCode: (verificationId: string, code: string) => repository.auth.verifyCode(verificationId, code),
  getSession: () => repository.auth.getSession(),
  signOut: () => repository.auth.signOut(),
};

export const ProfileService = {
  getMyProfile: () => repository.profile.getMine(),
  createProfile: (input: NewProfileInput) => repository.profile.create(input),
  updateMyProfile: (patch: ProfileDetailsPatch) => repository.profile.updateDetails(patch),
  uploadPhoto: (uri: string) => repository.profile.addPhoto(uri),
  removePhoto: (photoId: string) => repository.profile.removePhoto(photoId),
  reorderPhotos: (photoIds: string[]) => repository.profile.reorderPhotos(photoIds),
  savePromptAnswers: (answers: { promptId: string; answer: string }[]) => repository.profile.saveAnswers(answers),
  setProfileActive: (isActive: boolean) => repository.profile.setActive(isActive),
  getPromptLibrary: () => repository.profile.getPromptLibrary(),
  getPreferences: () => repository.profile.getPreferences(),
  savePreferences: (preferences: Preferences) => repository.profile.savePreferences(preferences),
  getPrivacy: () => repository.profile.getPrivacy(),
  savePrivacy: (settings: Pick<PrivacySettings, 'showDistance'>) => repository.profile.savePrivacy(settings),
  updateLocation: (location: CoarseLocation | null) => repository.profile.updateLocation(location),
};

export const DiscoveryService = {
  getSuggestedProfiles: (cursor?: string) => repository.discovery.getSuggested(cursor),
  getProfile: (userId: string) => repository.discovery.getProfile(userId),
  likeProfileItem: (input: LikeInput) => repository.discovery.like(input),
  passProfile: (userId: string) => repository.discovery.pass(userId),
  undoPass: (userId: string) => repository.discovery.undoPass(userId),
};

export const LikesService = {
  getIncomingLikes: () => repository.likes.getIncoming(),
  acceptLike: (likeId: string) => repository.likes.accept(likeId),
  passLike: (likeId: string) => repository.likes.pass(likeId),
};

export const MatchesService = {
  getMatches: () => repository.matches.list(),
  getMatch: (matchId: string) => repository.matches.get(matchId),
  unmatch: (matchId: string) => repository.matches.unmatch(matchId),
};

export const MessagingService = {
  getMessages: (matchId: string) => repository.messaging.list(matchId),
  sendMessage: (matchId: string, body: string, clientId: string) => repository.messaging.send(matchId, body, clientId),
  subscribe: (listener: (event: { matchId: string }) => void) => repository.messaging.subscribe(listener),
};

export const SafetyService = {
  blockUser: (userId: string) => repository.safety.block(userId),
  reportUser: (input: ReportInput) => repository.safety.report(input),
  deleteAccount: () => repository.safety.deleteAccount(),
};

export const DevService = repository.dev;
