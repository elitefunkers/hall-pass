import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/SettingsRow';
import { ErrorState, ListSkeleton } from '@/components/States';
import { TopBar } from '@/components/TopBar';
import { errorMessage, useMyProfile, usePrivacy, useProfileMutations } from '@/hooks/queries';
import { toast } from '@/state/toast';
import { getCoarseDeviceLocation } from '@/utils/location';
import { colors, radius, space } from '@/theme/tokens';

const tips = [
  'Keep conversations in Hall Pass until you trust someone.',
  'Never send money or share financial details.',
  'Meet in a public place and tell a friend where you’re going.',
];

export default function PrivacySettings() {
  const privacy = usePrivacy();
  const me = useMyProfile();
  const { savePrivacy, setActive, updateLocation } = useProfileMutations();
  const onError = (e: unknown) => toast.error(errorMessage(e));

  return (
    <Screen scroll header={<TopBar title="Privacy and safety" />}>
      <View style={styles.body}>
        {privacy.isError ? (
          <ErrorState message={errorMessage(privacy.error)} onRetry={() => privacy.refetch()} />
        ) : !privacy.data || !me.data ? (
          <ListSkeleton rows={2} />
        ) : (
          <View style={styles.section}>
            <SwitchRow
              label="Show me in Discover"
              hint="Turn off to pause. Existing matches and chats stay."
              value={me.data.isActive}
              disabled={setActive.isPending}
              onChange={(v) => setActive.mutate(v, { onError })}
            />
            <SwitchRow
              label="Show approximate distance"
              hint="Others see something like “About 5 km away”. Your exact location is never shown."
              value={privacy.data.showDistance}
              disabled={savePrivacy.isPending}
              onChange={(v) => savePrivacy.mutate({ showDistance: v }, { onError })}
            />
            <SwitchRow
              label="Use my device location"
              hint={
                privacy.data.useDeviceLocation
                  ? 'On. Distances use your approximate position, rounded to about 5 km on your phone.'
                  : 'Off. Distances are hidden and only your typed area is shown.'
              }
              value={privacy.data.useDeviceLocation}
              disabled={updateLocation.isPending}
              onChange={async (v) => {
                if (!v) {
                  updateLocation.mutate(null, { onError });
                  return;
                }
                const result = await getCoarseDeviceLocation();
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }
                updateLocation.mutate(result.location, {
                  onSuccess: () => toast.show('Location updated.', { tone: 'success' }),
                  onError,
                });
              }}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Feather name="slash" size={18} color={colors.inkMuted} />
            <AppText variant="caption" color={colors.inkMuted} style={styles.flex}>
              To block or report someone, open their profile or your chat and tap the ••• menu.
            </AppText>
          </View>
        </View>

        <View style={styles.tips}>
          <AppText variant="heading">Dating safely</AppText>
          {tips.map((t) => (
            <View key={t} style={styles.infoRow}>
              <Feather name="check" size={16} color={colors.success} />
              <AppText style={styles.flex}>{t}</AppText>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingTop: space.xs },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
  },
  infoRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  tips: { gap: space.sm },
});
