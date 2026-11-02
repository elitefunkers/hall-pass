import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ListSkeleton } from '@/components/States';
import { StepFooter, StepHeader } from '@/components/Step';
import { TopBar } from '@/components/TopBar';
import { ONBOARDING_STEPS } from '@/features/onboarding/steps';
import { PromptEditor, promptAnswersValid } from '@/features/profile/PromptEditor';
import { usePromptLibrary } from '@/hooks/queries';
import { useSessionStore } from '@/state/session';
import { space } from '@/theme/tokens';

export default function OnboardingPrompts() {
  const router = useRouter();
  const answers = useSessionStore((s) => s.draft.answers);
  const updateDraft = useSessionStore((s) => s.updateDraft);
  const library = usePromptLibrary();
  const [showErrors, setShowErrors] = useState(false);

  return (
    <Screen
      scroll
      header={<TopBar step={{ current: 4, total: ONBOARDING_STEPS }} />}
      plainFooter
      footer={
        <StepFooter
          label="Preview my profile"
          onNext={() => {
            setShowErrors(true);
            if (promptAnswersValid(answers)) router.push('/preview');
          }}
        />
      }
    >
      <View style={styles.body}>
        <StepHeader
          title="Pick prompts to share your story"
          body="Pick three prompts. Specific answers get better first messages than clever ones."
        />
        {library.data ? (
          <PromptEditor library={library.data} answers={answers} onChange={(a) => updateDraft({ answers: a })} showErrors={showErrors} />
        ) : (
          <ListSkeleton rows={3} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
});
