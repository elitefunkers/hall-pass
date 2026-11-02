import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { LinkRow, SwitchRow } from '@/components/SettingsRow';
import { ErrorState, ProfileSkeleton } from '@/components/States';
import { errorMessage, useMyProfile, useProfileMutations } from '@/hooks/queries';
import { toast } from '@/state/toast';
import { ageFromDateOfBirth } from '@/utils/age';
import { colors, radius, space } from '@/theme/tokens';

export default function MyProfile() {
  const router = useRouter();
  const me = useMyProfile();
  const { setActive } = useProfileMutations();

  if (me.isPending) {
    return (
      <Screen edges={{ bottom: false }}>
        <ProfileSkeleton />
      </Screen>
    );
  }
  if (me.isError || !me.data) {
    return (
      <Screen edges={{ bottom: false }}>
        <ErrorState message={errorMessage(me.error)} onRetry={() => me.refetch()} />
      </Screen>
    );
  }

  const profile = me.data;
  const pending = profile.photos.some((p) => p.moderationStatus === 'pending');

  return (
    <Screen scroll edges={{ bottom: false }}>
      <View style={styles.head}>
        <View style={styles.ring}>
          <Photo uri={profile.photos[0]?.uri ?? ''} aspectRatio={1} rounded={radius.pill} style={styles.avatar} accessibilityLabel="Your first photo" />
        </View>
        <AppText variant="title" align="center">
          {profile.firstName}
        </AppText>
        <AppText variant="label" color={colors.inkMuted} align="center">
          {ageFromDateOfBirth(profile.dateOfBirth)} · {profile.broadLocation}
        </AppText>
        <Button label="Edit profile" variant="secondary" compact icon="edit-3" onPress={() => router.push('/settings/edit-profile')} style={styles.edit} />
      </View>

      {pending ? (
        <View style={styles.notice}>
          <AppText variant="caption" color={colors.inkMuted}>
            Some photos are waiting for review. They’ll appear to others once approved.
          </AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <SwitchRow
          label="Show me in Discover"
          hint={profile.isActive ? 'People can see your profile.' : 'Paused — you keep your matches, but new people won’t see you.'}
          value={profile.isActive}
          disabled={setActive.isPending}
          onChange={(v) =>
            setActive.mutate(v, {
              onSuccess: () => toast.show(v ? 'Your profile is visible again.' : 'Your profile is paused.', { tone: 'success' }),
              onError: (e) => toast.error(errorMessage(e)),
            })
          }
        />
      </View>

      <AppText variant="label" color={colors.inkMuted} style={styles.sectionLabel}>
        Settings
      </AppText>
      <View style={styles.section}>
        <LinkRow icon="sliders" label="Dating preferences" hint="Who you see in Discover" onPress={() => router.push('/settings/preferences')} />
        <LinkRow icon="shield" label="Privacy and safety" hint="Distance, visibility, blocking" onPress={() => router.push('/settings/privacy')} />
        <LinkRow icon="settings" label="Account" hint="Sign out or delete your account" onPress={() => router.push('/settings/account')} />
      </View>

      <AppText variant="caption" color={colors.inkSubtle} align="center" style={styles.version}>
        Hall Pass · Version 1 preview
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: space.xxs, paddingTop: space.xl, paddingBottom: space.lg },
  ring: { padding: 4, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.accent, marginBottom: space.sm },
  avatar: { width: 112 },
  edit: { marginTop: space.sm, alignSelf: 'center' },
  notice: { padding: space.sm, borderRadius: radius.md, backgroundColor: colors.sunken, marginBottom: space.md },
  sectionLabel: { marginBottom: space.xs, marginLeft: space.xxs },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xxs,
    marginBottom: space.md,
  },
  version: { marginTop: space.md },
});
