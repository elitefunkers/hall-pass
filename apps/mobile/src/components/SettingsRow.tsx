import Feather from '@expo/vector-icons/Feather';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, layout, space } from '@/theme/tokens';
import { AppText } from './AppText';
import type { IconName } from './Button';

interface LinkRowProps {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
}

export function LinkRow({ icon, label, hint, onPress }: LinkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sunken }]}
    >
      <Feather name={icon} size={20} color={colors.ink} />
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={colors.inkMuted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={colors.inkMuted} />
    </Pressable>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({ label, hint, value, onChange, disabled }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={colors.inkMuted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: colors.lineStrong, true: colors.accent }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.lineStrong}
        // react-native-web colours the "on" thumb separately and defaults it to teal.
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.surface } : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: layout.minTouch + 12,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    marginHorizontal: -space.xs,
    borderRadius: 12,
  },
  text: { flex: 1, gap: 2 },
});
