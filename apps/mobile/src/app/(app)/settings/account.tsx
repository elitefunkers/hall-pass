import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { SwitchRow } from '@/components/SettingsRow';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { errorMessage } from '@/hooks/queries';
import { AuthService, DevService, SafetyService } from '@/services';
import { useSessionStore } from '@/state/session';
import { toast } from '@/state/toast';
import { colors, radius, space } from '@/theme/tokens';

export default function Account() {
  const qc = useQueryClient();
  const session = useSessionStore((s) => s.session);
  const signedOut = useSessionStore((s) => s.signedOut);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [simulateErrors, setSimulateErrors] = useState(() => DevService?.getSimulateNetworkErrors() ?? false);

  const finish = () => {
    qc.clear();
    signedOut();
  };

  const signOut = useMutation({ mutationFn: AuthService.signOut, onSuccess: finish, onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: SafetyService.deleteAccount, onSuccess: finish, onError: (e) => toast.error(errorMessage(e)) });

  return (
    <Screen scroll header={<TopBar title="Account" />}>
      <View style={styles.body}>
        <View style={styles.section}>
          <AppText variant="label" color={colors.inkMuted}>
            Signed in with {session?.method === 'phone' ? 'phone' : 'email'}
          </AppText>
          <AppText variant="bodyStrong">{session?.identifier}</AppText>
          <Button label="Sign out" variant="secondary" icon="log-out" onPress={() => signOut.mutate()} loading={signOut.isPending} />
        </View>

        <View style={styles.section}>
          <AppText variant="heading">Delete account</AppText>
          <AppText color={colors.inkMuted}>
            This permanently removes your profile, photos, likes, matches and messages. Pausing your profile is an alternative if
            you just need a break.
          </AppText>
          <Button label="Delete my account" variant="danger" icon="trash-2" onPress={() => setDeleting(true)} />
        </View>

        {DevService ? (
          <View style={styles.section}>
            <AppText variant="heading">Testing tools</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              Only in this preview build, which runs on sample data stored on this device.
            </AppText>
            <SwitchRow
              label="Simulate network errors"
              hint="Every request fails so you can check error states."
              value={simulateErrors}
              onChange={(v) => {
                DevService?.setSimulateNetworkErrors(v);
                setSimulateErrors(v);
              }}
            />
            <Button
              label="Reset sample data"
              variant="secondary"
              icon="rotate-ccw"
              onPress={async () => {
                await DevService?.reset();
                finish();
              }}
            />
          </View>
        ) : null}
      </View>

      <Sheet visible={deleting} onClose={() => setDeleting(false)} title="Delete your account?">
        <AppText color={colors.inkMuted}>This can’t be undone. Type DELETE to confirm.</AppText>
        <TextField label="Confirmation" value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} />
        <Button
          label="Permanently delete"
          variant="danger"
          disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
          loading={remove.isPending}
          onPress={() => remove.mutate()}
        />
        <Button label="Keep my account" variant="quiet" onPress={() => setDeleting(false)} />
      </Sheet>
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
});
