import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button, type IconName } from './Button';

export function Skeleton({ height, width = '100%', rounded = radius.md }: { height: number; width?: DimensionValue; rounded?: number }) {
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);
  return <Animated.View style={{ height, width, borderRadius: rounded, backgroundColor: colors.sunken, opacity }} />;
}

export function ProfileSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityLabel="Loading profile" accessibilityRole="progressbar">
      <Skeleton height={36} width="55%" rounded={radius.sm} />
      <Skeleton height={18} width="35%" rounded={radius.sm} />
      <Skeleton height={420} rounded={radius.lg} />
      <Skeleton height={140} rounded={radius.lg} />
    </View>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.skeleton} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton height={56} width={56} rounded={radius.pill} />
          <View style={styles.rowText}>
            <Skeleton height={18} width="50%" rounded={radius.sm} />
            <Skeleton height={14} width="80%" rounded={radius.sm} />
          </View>
        </View>
      ))}
    </View>
  );
}

interface MessageStateProps {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: MessageStateProps) {
  return (
    <View style={styles.center}>
      <View style={styles.badge}>
        <Feather name={icon} size={26} color={colors.accent} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText color={colors.inkMuted} align="center" style={styles.body}>
        {body}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <View style={[styles.badge, { backgroundColor: colors.dangerTint }]}>
        <Feather name="wifi-off" size={26} color={colors.danger} />
      </View>
      <AppText variant="title" align="center">
        That didn’t load
      </AppText>
      <AppText color={colors.inkMuted} align="center" style={styles.body}>
        {message}
      </AppText>
      <Button label="Try again" icon="refresh-cw" onPress={onRetry} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: space.md, paddingVertical: space.lg },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  rowText: { flex: 1, gap: space.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.xxl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { maxWidth: 340 },
});
