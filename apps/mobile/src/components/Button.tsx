import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, radius, shadow, space } from '@/theme/tokens';
import { AppText } from './AppText';

type Variant = 'primary' | 'dark' | 'secondary' | 'quiet' | 'danger' | 'inverse' | 'quietInverse';
export type IconName = ComponentProps<typeof Feather>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

const palette: Record<Variant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, pressed: colors.accentPressed, fg: colors.onAccent, border: colors.accent },
  dark: { bg: colors.ink, pressed: '#3A3536', fg: colors.inkInverse, border: colors.ink },
  secondary: { bg: colors.surface, pressed: colors.sunken, fg: colors.ink, border: colors.lineStrong },
  quiet: { bg: 'transparent', pressed: colors.sunken, fg: colors.ink, border: 'transparent' },
  danger: { bg: colors.danger, pressed: '#86201A', fg: '#FFFFFF', border: colors.danger },
  inverse: { bg: '#FFFFFF', pressed: '#ECE8E4', fg: colors.ink, border: '#FFFFFF' },
  quietInverse: { bg: 'transparent', pressed: 'rgba(255, 255, 255, 0.14)', fg: '#FFFFFF', border: 'transparent' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  style,
  compact,
}: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      android_ripple={variant === 'quiet' ? { color: colors.line } : undefined}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border },
        inactive && styles.inactive,
        focused && styles.focused,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={18} color={p.fg} /> : null}
            <AppText variant="bodyStrong" color={p.fg} numberOfLines={1}>
              {label}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'plain' | 'surface';
  color?: string;
  disabled?: boolean;
}

export function IconButton({ icon, accessibilityLabel, onPress, tone = 'plain', color = colors.ink, disabled }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.icon,
        tone === 'surface' && styles.iconSurface,
        pressed && { backgroundColor: colors.sunken },
        disabled && styles.inactive,
        focused && styles.focused,
      ]}
    >
      <Feather name={icon} size={22} color={color} />
    </Pressable>
  );
}

type CircleTone = 'light' | 'dark' | 'accent';

const circlePalette: Record<CircleTone, { bg: string; pressed: string; fg: string }> = {
  light: { bg: colors.surface, pressed: colors.sunken, fg: colors.ink },
  dark: { bg: colors.ink, pressed: '#3A3536', fg: colors.inkInverse },
  accent: { bg: colors.accent, pressed: colors.accentPressed, fg: colors.onAccent },
};

interface CircleButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  tone?: CircleTone;
  size?: 'md' | 'lg';
  iconColor?: string;
  raised?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Round icon-only control: like hearts, pass, and the onboarding "next" arrow. */
export function CircleButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  tone = 'light',
  size = 'md',
  iconColor,
  raised,
  loading,
  disabled,
  style,
}: CircleButtonProps) {
  const p = circlePalette[tone];
  const inactive = disabled || loading;
  const dim = size === 'lg' ? 60 : layout.minTouch;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      hitSlop={6}
      style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
        styles.circle,
        { width: dim, height: dim, backgroundColor: pressed ? p.pressed : p.bg },
        tone === 'light' && !raised && styles.circleOutline,
        raised && shadow,
        disabled && tone !== 'light' && styles.circleDisabled,
        disabled && tone === 'light' && styles.inactive,
        focused && styles.focused,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <Feather name={icon} size={size === 'lg' ? 26 : 22} color={disabled && tone !== 'light' ? colors.inkSubtle : (iconColor ?? p.fg)} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  compact: { minHeight: layout.minTouch, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  inactive: { opacity: 0.45 },
  focused: { outlineColor: colors.accent, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2 } as ViewStyle,
  icon: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSurface: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  circle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  circleOutline: { borderWidth: 1, borderColor: colors.line },
  circleDisabled: { backgroundColor: colors.sunken },
});
