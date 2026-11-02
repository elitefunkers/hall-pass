import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StepFooter, StepHeader } from '@/components/Step';
import { TopBar } from '@/components/TopBar';
import { limits } from '@/config';
import { ONBOARDING_STEPS } from '@/features/onboarding/steps';
import { PhotoGrid } from '@/features/profile/PhotoGrid';
import { useSessionStore } from '@/state/session';
import { colors, radius, space } from '@/theme/tokens';

export default function OnboardingPhotos() {
  const router = useRouter();
  const photoUris = useSessionStore((s) => s.draft.photoUris);
  const updateDraft = useSessionStore((s) => s.updateDraft);
  const [showErrors, setShowErrors] = useState(false);

  const set = (uris: string[]) => updateDraft({ photoUris: uris });
  const enough = photoUris.length >= limits.minPhotos;

  return (
    <Screen
      scroll
      header={<TopBar step={{ current: 3, total: ONBOARDING_STEPS }} />}
      plainFooter
      footer={
        <StepFooter
          label="Continue"
          left={
            <AppText variant="caption" color={colors.inkMuted}>
              {photoUris.length} of {limits.maxPhotos} added
            </AppText>
          }
          onNext={() => {
            setShowErrors(true);
            if (enough) router.push('/prompts');
          }}
        />
      }
    >
      <View style={styles.body}>
        <StepHeader
          title="Add photos that represent you"
          body={`Add ${limits.minPhotos} to ${limits.maxPhotos}. Recent, clear photos where your face is visible work best. Your first photo leads your profile.`}
        />

        <View style={styles.note}>
          <Feather name="lock" size={18} color={colors.inkMuted} />
          <AppText variant="caption" color={colors.inkMuted} style={styles.flex}>
            Your phone may ask for photo access. Hall Pass only sees the photos you pick, and every photo is reviewed before
            other people can see it.
          </AppText>
        </View>

        <PhotoGrid
          photos={photoUris.map((uri, i) => ({ key: `${i}-${uri}`, uri }))}
          onAdd={(uri) => set([...photoUris, uri].slice(0, limits.maxPhotos))}
          onRemove={(index) => set(photoUris.filter((_, i) => i !== index))}
          onMove={(from, to) => {
            const next = [...photoUris];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            set(next);
          }}
        />

        {showErrors && !enough ? (
          <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
            Add at least {limits.minPhotos} photos to continue.
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  flex: { flex: 1 },
});
