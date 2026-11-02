import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { CircleButton } from './Button';

/** Big serif question at the top of a sign-up or onboarding step. */
export function StepHeader({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.header}>
      <AppText variant="display" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText color={colors.inkMuted} align="center" style={styles.body}>
          {body}
        </AppText>
      ) : null}
    </View>
  );
}

interface StepFooterProps {
  /** Spoken label for the arrow, e.g. "Continue" or "Send code". */
  label: string;
  onNext: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional note or control shown to the left of the arrow. */
  left?: ReactNode;
}

export function StepFooter({ label, onNext, loading, disabled, left }: StepFooterProps) {
  return (
    <View style={styles.footer}>
      <View style={styles.left}>{left}</View>
      <CircleButton icon="arrow-right" tone="dark" size="lg" accessibilityLabel={label} onPress={onNext} loading={loading} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xs, alignItems: 'center' },
  body: { maxWidth: 360 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xxs },
  left: { flex: 1 },
});
