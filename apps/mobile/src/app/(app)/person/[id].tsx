import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, CircleButton, IconButton } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ErrorState, ProfileSkeleton } from '@/components/States';
import { TopBar } from '@/components/TopBar';
import { ProfileView } from '@/features/profile/ProfileView';
import { SafetyMenu } from '@/features/safety/SafetyMenu';
import { errorMessage, usePerson, useRespondToLike } from '@/hooks/queries';
import { toast } from '@/state/toast';
import { space } from '@/theme/tokens';

export default function PersonProfile() {
  const router = useRouter();
  const { id, likeId, matchId } = useLocalSearchParams<{ id: string; likeId?: string; matchId?: string }>();
  const person = usePerson(id);
  const { accept, pass } = useRespondToLike();
  const [menu, setMenu] = useState(false);
  const name = person.data?.firstName ?? 'this person';

  const footer = likeId ? (
    <View style={styles.actions}>
      <CircleButton
        icon="x"
        size="lg"
        accessibilityLabel={`Pass on ${name}`}
        disabled={accept.isPending}
        loading={pass.isPending}
        onPress={() => pass.mutate(likeId, { onSuccess: () => router.back(), onError: (e) => toast.error(errorMessage(e)) })}
      />
      <Button
        label={`Match with ${name}`}
        icon="heart"
        style={styles.flex}
        disabled={pass.isPending}
        loading={accept.isPending}
        onPress={() =>
          accept.mutate(likeId, {
            onSuccess: ({ matchId: newMatch }) => router.replace({ pathname: '/match/[matchId]', params: { matchId: newMatch } }),
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </View>
  ) : null;

  return (
    <Screen
      scroll
      header={
        <TopBar
          right={person.data ? <IconButton icon="more-horizontal" accessibilityLabel={`More options for ${name}`} onPress={() => setMenu(true)} /> : undefined}
        />
      }
      footer={person.data ? footer : null}
    >
      {person.isPending ? (
        <ProfileSkeleton />
      ) : person.isError ? (
        <ErrorState message={errorMessage(person.error)} onRetry={() => person.refetch()} />
      ) : (
        <ProfileView profile={person.data} />
      )}
      {person.data ? (
        <SafetyMenu
          visible={menu}
          onClose={() => setMenu(false)}
          userId={person.data.id}
          name={person.data.firstName}
          matchId={matchId}
          onLeave={() => router.dismissTo('/discover')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
});
