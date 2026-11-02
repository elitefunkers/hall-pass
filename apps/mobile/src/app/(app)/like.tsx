import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { ErrorState, ProfileSkeleton } from '@/components/States';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { limits } from '@/config';
import { errorMessage, useLikeProfileItem, usePerson } from '@/hooks/queries';
import { toast } from '@/state/toast';
import type { LikeTargetType } from '@/types/domain';
import { colors, radius, space } from '@/theme/tokens';

export default function LikeComposer() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; type: LikeTargetType; itemId?: string }>();
  const person = usePerson(params.userId);
  const like = useLikeProfileItem();
  const [comment, setComment] = useState('');

  const type: LikeTargetType = params.type === 'photo' || params.type === 'prompt' ? params.type : 'profile';
  const photo = type === 'photo' ? person.data?.photos.find((p) => p.id === params.itemId) : undefined;
  const answer = type === 'prompt' ? person.data?.answers.find((a) => a.id === params.itemId) : undefined;

  const send = () => {
    if (!person.data) return;
    const name = person.data.firstName;
    like.mutate(
      { targetUserId: person.data.id, target: { type, itemId: params.itemId || undefined }, comment: comment.trim() || undefined },
      {
        onSuccess: ({ matchId }) => {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          if (matchId) {
            router.replace({ pathname: '/match/[matchId]', params: { matchId } });
          } else {
            router.back();
            toast.show(`Like sent to ${name}.`, { tone: 'success' });
          }
        },
      },
    );
  };

  return (
    <Screen
      scroll
      header={<TopBar title={person.data ? `Like ${person.data.firstName}` : 'Send a like'} backLabel="Cancel" backIcon="x" />}
      footer={
        person.data ? (
          <Button label={comment.trim() ? 'Send like with note' : 'Send like'} icon="heart" onPress={send} loading={like.isPending} />
        ) : null
      }
    >
      {person.isPending ? (
        <ProfileSkeleton />
      ) : person.isError ? (
        <ErrorState message={errorMessage(person.error)} onRetry={() => person.refetch()} />
      ) : (
        <View style={styles.body}>
          {photo ? (
            <Photo uri={photo.uri} aspectRatio={4 / 5} rounded={radius.md} style={styles.photo} accessibilityLabel={`${person.data.firstName}’s photo you’re liking`} />
          ) : answer ? (
            <View style={styles.prompt}>
              <AppText variant="label" color={colors.inkMuted}>
                {answer.promptText}
              </AppText>
              <AppText variant="answer">{answer.answer}</AppText>
            </View>
          ) : (
            <View style={styles.prompt}>
              <AppText variant="answer">You’re liking {person.data.firstName}’s profile.</AppText>
            </View>
          )}

          <TextField
            label="Add a note (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={limits.likeComment}
            showCount
            placeholder={answer ? 'Reply to what they wrote…' : `Say what caught your eye…`}
            helper="A short note makes it easier for them to reply."
          />

          {like.isError ? (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              {errorMessage(like.error)}
            </AppText>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingTop: space.xs },
  photo: { width: '82%', alignSelf: 'center' },
  prompt: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
});
