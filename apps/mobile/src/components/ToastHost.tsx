import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/state/toast';
import { colors, layout, radius, shadow, space } from '@/theme/tokens';
import { AppText } from './AppText';

export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => dismiss(current.id), current.durationMs);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  if (!current) return null;
  const icon = current.tone === 'error' ? 'alert-circle' : current.tone === 'success' ? 'check-circle' : 'info';
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 148 }]}>
      <View style={[styles.toast, shadow]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Feather name={icon} size={18} color={colors.inkInverse} />
        <AppText color={colors.inkInverse} style={styles.message}>
          {current.message}
        </AppText>
        {current.action ? (
          <Pressable
            onPress={() => {
              current.action?.onPress();
              dismiss(current.id);
            }}
            accessibilityRole="button"
            hitSlop={10}
            style={styles.action}
          >
            <AppText variant="bodyStrong" color={colors.accentTint}>
              {current.action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: layout.gutter },
  toast: {
    width: '100%',
    maxWidth: layout.maxContentWidth - layout.gutter * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: layout.minTouch,
  },
  message: { flex: 1 },
  action: { paddingHorizontal: space.xs, paddingVertical: space.xxs },
});
