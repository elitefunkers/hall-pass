import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { StepFooter, StepHeader } from '@/components/Step';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { otp } from '@/config';
import { codeSchema, firstError } from '@/domain/schemas';
import { errorMessage } from '@/hooks/queries';
import { AuthService, ProfileService } from '@/services';
import { useSessionStore } from '@/state/session';
import { toast } from '@/state/toast';
import { space } from '@/theme/tokens';

const RESEND_SECONDS = 30;

export default function Verify() {
  const params = useLocalSearchParams<{ verificationId: string; identifier: string; method: 'email' | 'phone' }>();
  const signedIn = useSessionStore((s) => s.signedIn);
  const [verificationId, setVerificationId] = useState(params.verificationId ?? '');
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = useMutation({
    mutationFn: async () => {
      const session = await AuthService.verifyCode(verificationId, code);
      const profile = await ProfileService.getMyProfile();
      return { session, hasProfile: profile !== null };
    },
    onSuccess: ({ session, hasProfile }) => signedIn(session, hasProfile),
  });

  const resend = useMutation({
    mutationFn: () => AuthService.requestCode(params.method ?? 'email', params.identifier ?? ''),
    onSuccess: (r) => {
      setVerificationId(r.verificationId);
      setWait(RESEND_SECONDS);
      toast.show('We sent a new code.', { tone: 'success' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const validation = firstError(codeSchema, code);
  const submit = () => {
    setTouched(true);
    if (!validation) verify.mutate();
  };

  return (
    <Screen scroll header={<TopBar />} plainFooter footer={<StepFooter label="Verify and continue" onNext={submit} loading={verify.isPending} />}>
      <View style={styles.body}>
        <StepHeader
          title="Enter your verification code"
          body={`We sent a ${otp.length}-digit code to ${params.identifier}. It expires in ${otp.expiry}.`}
        />
        <TextField
          label={`${otp.length}-digit code`}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, otp.length))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={otp.length}
          autoFocus
          onSubmitEditing={submit}
          helper={otp.demo ? `Demo build: any ${otp.length} digits will work.` : undefined}
          error={(touched && validation) || (verify.error ? errorMessage(verify.error) : null)}
        />
        <Button
          label={wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          variant="quiet"
          disabled={wait > 0}
          loading={resend.isPending}
          onPress={() => resend.mutate()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
});
