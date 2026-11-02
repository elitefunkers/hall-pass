import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StepFooter, StepHeader } from '@/components/Step';
import { TopBar } from '@/components/TopBar';
import { useSessionStore } from '@/state/session';
import { colors, layout, radius, space } from '@/theme/tokens';

export default function AgeGate() {
  const router = useRouter();
  const confirmAge = useSessionStore((s) => s.confirmAge);
  const [checked, setChecked] = useState(false);

  return (
    <Screen
      scroll
      header={<TopBar />}
      plainFooter
      footer={
        <StepFooter
          label="Continue"
          disabled={!checked}
          left={
            !checked ? (
              <AppText variant="caption" color={colors.inkMuted}>
                Tick the box to continue.
              </AppText>
            ) : null
          }
          onNext={() => {
            confirmAge();
            router.replace('/sign-in');
          }}
        />
      }
    >
      <View style={styles.body}>
        <StepHeader
          title="Hall Pass is for adults"
          body="You need to be 18 or older to create an account. We’ll check your date of birth when you set up your profile, and anyone who appears to be under 18 can be reported and removed."
        />

        <Pressable
          onPress={() => setChecked((c) => !c)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel="I confirm I’m 18 or older"
          style={[styles.check, checked && styles.checkOn]}
        >
          <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Feather name="check" size={18} color={colors.inkInverse} /> : null}</View>
          <AppText variant="bodyStrong" style={styles.flex}>
            I confirm I’m 18 or older
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  check: {
    minHeight: layout.minTouch + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  checkOn: { borderColor: colors.ink },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.ink },
  flex: { flex: 1 },
});
