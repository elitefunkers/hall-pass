import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ErrorState, ListSkeleton } from '@/components/States';
import { TopBar } from '@/components/TopBar';
import { preferencesSchema } from '@/domain/schemas';
import { PreferencesForm } from '@/features/profile/PreferencesForm';
import { errorMessage, usePreferences, useProfileMutations } from '@/hooks/queries';
import { toast } from '@/state/toast';
import type { Preferences } from '@/types/domain';
import { space } from '@/theme/tokens';

export default function PreferencesSettings() {
  const router = useRouter();
  const prefs = usePreferences();
  const { savePreferences } = useProfileMutations();
  const [value, setValue] = useState<Preferences | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (prefs.data && !value) setValue(prefs.data);
  }, [prefs.data, value]);

  const save = () => {
    setShowErrors(true);
    if (!value || !preferencesSchema.safeParse(value).success) return;
    savePreferences.mutate(value, {
      onSuccess: () => {
        toast.show('Preferences saved. Discover will update.', { tone: 'success' });
        router.back();
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  return (
    <Screen scroll header={<TopBar title="Dating preferences" />} footer={value ? <Button label="Save" onPress={save} loading={savePreferences.isPending} /> : null}>
      <View style={styles.body}>
        {prefs.isError ? (
          <ErrorState message={errorMessage(prefs.error)} onRetry={() => prefs.refetch()} />
        ) : value ? (
          <PreferencesForm value={value} onChange={setValue} showErrors={showErrors} />
        ) : (
          <ListSkeleton rows={3} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: space.xs },
});
