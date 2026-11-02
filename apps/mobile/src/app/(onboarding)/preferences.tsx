import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { StepFooter, StepHeader } from '@/components/Step';
import { TopBar } from '@/components/TopBar';
import { preferencesSchema } from '@/domain/schemas';
import { ONBOARDING_STEPS } from '@/features/onboarding/steps';
import { PreferencesForm } from '@/features/profile/PreferencesForm';
import { useSessionStore } from '@/state/session';
import { space } from '@/theme/tokens';

export default function OnboardingPreferences() {
  const router = useRouter();
  const draft = useSessionStore((s) => s.draft);
  const updateDraft = useSessionStore((s) => s.updateDraft);
  const [prefs, setPrefs] = useState(draft.preferences);
  const [showErrors, setShowErrors] = useState(false);

  const next = () => {
    setShowErrors(true);
    if (!preferencesSchema.safeParse(prefs).success) return;
    updateDraft({ preferences: prefs });
    router.push('/photos');
  };

  return (
    <Screen
      scroll
      header={<TopBar step={{ current: 2, total: ONBOARDING_STEPS }} />}
      plainFooter
      footer={<StepFooter label="Continue" onNext={next} />}
    >
      <View style={styles.body}>
        <StepHeader title="Who are you open to meeting?" body="You can change this any time from your profile." />
        <PreferencesForm value={prefs} onChange={setPrefs} showErrors={showErrors} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
});
