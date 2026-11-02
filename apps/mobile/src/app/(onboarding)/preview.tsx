import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { ONBOARDING_STEPS } from '@/features/onboarding/steps';
import { ProfileView } from '@/features/profile/ProfileView';
import { errorMessage, keys, usePromptLibrary } from '@/hooks/queries';
import { ProfileService } from '@/services';
import { useSessionStore } from '@/state/session';
import { toast } from '@/state/toast';
import type { PublicProfile } from '@/types/domain';
import { ageFromDateOfBirth } from '@/utils/age';
import { colors, space } from '@/theme/tokens';

export default function Preview() {
  const draft = useSessionStore((s) => s.draft);
  const userId = useSessionStore((s) => s.session?.userId ?? 'me');
  const profilePublished = useSessionStore((s) => s.profilePublished);
  const library = usePromptLibrary();
  const qc = useQueryClient();

  const preview: PublicProfile = {
    id: userId,
    firstName: draft.firstName,
    age: draft.dateOfBirth ? ageFromDateOfBirth(draft.dateOfBirth) : 0,
    gender: draft.gender ?? 'woman',
    broadLocation: draft.broadLocation,
    photos: draft.photoUris.map((uri, i) => ({ id: `draft-${i}`, uri, order: i, moderationStatus: 'pending' })),
    answers: draft.answers.map((a, i) => ({
      id: `draft-a${i}`,
      promptId: a.promptId,
      promptText: library.data?.find((p) => p.id === a.promptId)?.text ?? '',
      answer: a.answer.trim(),
      order: i,
    })),
  };

  const publish = useMutation({
    mutationFn: () => {
      if (!draft.gender || !draft.orientation) throw new Error('Go back and finish the basics first.');
      return ProfileService.createProfile({
        firstName: draft.firstName,
        dateOfBirth: draft.dateOfBirth,
        gender: draft.gender,
        orientation: draft.orientation,
        broadLocation: draft.broadLocation,
        photoUris: draft.photoUris,
        answers: draft.answers.map((a) => ({ promptId: a.promptId, answer: a.answer.trim() })),
        preferences: draft.preferences,
        coarseLocation: draft.coarseLocation,
      });
    },
    onSuccess: (profile) => {
      qc.setQueryData(keys.me, profile);
      profilePublished();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen
      scroll
      header={<TopBar step={{ current: 5, total: ONBOARDING_STEPS }} />}
      footer={
        <View style={styles.footer}>
          <Button label={publish.isError ? 'Try publishing again' : 'Publish my profile'} onPress={() => publish.mutate()} loading={publish.isPending} />
          <AppText variant="caption" color={colors.inkMuted} align="center">
            You can edit or pause your profile any time.
          </AppText>
        </View>
      }
    >
      <View style={styles.body}>
        <AppText variant="title">This is how others will see you</AppText>
        <ProfileView profile={preview} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingTop: space.xs },
  footer: { gap: space.xs },
});
