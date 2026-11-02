import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { IconButton, type IconName } from './Button';

interface TopBarProps {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  /** "x" suits modals; the default chevron suits pushed screens. */
  backIcon?: IconName;
  hideBack?: boolean;
  right?: ReactNode;
  step?: { current: number; total: number };
}

export function TopBar({ title, onBack, backLabel = 'Go back', backIcon = 'chevron-left', hideBack, right, step }: TopBarProps) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {hideBack ? <View style={styles.spacer} /> : <IconButton icon={backIcon} accessibilityLabel={backLabel} onPress={onBack ?? (() => router.back())} />}
        <View style={styles.titleWrap}>
          {title ? (
            <AppText variant="heading" numberOfLines={1} align="center">
              {title}
            </AppText>
          ) : null}
        </View>
        {right ?? <View style={styles.spacer} />}
      </View>
      {step ? (
        <View
          style={styles.progress}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step.current} of ${step.total}`}
          accessibilityValue={{ min: 0, max: step.total, now: step.current }}
        >
          {Array.from({ length: step.total }, (_, i) => (
            <View key={i} style={[styles.segment, i < step.current && styles.segmentOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.xxs, paddingBottom: space.xs, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -space.sm },
  titleWrap: { flex: 1 },
  spacer: { width: 48 },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.line },
  segmentOn: { backgroundColor: colors.accent },
});
