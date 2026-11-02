import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChipGroup } from '@/components/Choice';
import { Screen } from '@/components/Screen';
import { StepFooter, StepHeader } from '@/components/Step';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { authMethods } from '@/config';
import { emailSchema, firstError, phoneSchema } from '@/domain/schemas';
import { errorMessage } from '@/hooks/queries';
import { AuthService } from '@/services';
import { space } from '@/theme/tokens';

type Method = 'email' | 'phone';

export default function SignIn() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('email');
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const validation = firstError(method === 'email' ? emailSchema : phoneSchema, value.trim());
  const request = useMutation({
    mutationFn: () => AuthService.requestCode(method, value.trim()),
    onSuccess: ({ verificationId }) =>
      router.push({ pathname: '/verify', params: { verificationId, identifier: value.trim(), method } }),
  });

  const submit = () => {
    setTouched(true);
    if (!validation) request.mutate();
  };

  return (
    <Screen scroll header={<TopBar />} plainFooter footer={<StepFooter label="Send code" onNext={submit} loading={request.isPending} />}>
      <View style={styles.body}>
        <StepHeader
          title={method === 'email' ? 'What’s your email?' : 'What’s your number?'}
          body="We’ll send you a one-time code. New here? Your account is created when you confirm it."
        />
        {authMethods.phone ? (
          <ChipGroup<Method>
            label="Use"
            options={[
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
            ]}
            selected={[method]}
            onToggle={(m) => {
              setMethod(m);
              setValue('');
              setTouched(false);
            }}
          />
        ) : null}
        <TextField
          key={method}
          label={method === 'email' ? 'Email address' : 'Mobile number'}
          value={value}
          onChangeText={setValue}
          onBlur={() => setTouched(true)}
          onSubmitEditing={submit}
          keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
          autoComplete={method === 'email' ? 'email' : 'tel'}
          textContentType={method === 'email' ? 'emailAddress' : 'telephoneNumber'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          placeholder={method === 'email' ? 'you@example.com' : '+44 7700 900123'}
          helper="Only used to sign you in. It never appears on your profile."
          error={(touched && validation) || (request.error ? errorMessage(request.error) : null)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
});
