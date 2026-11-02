import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, layout, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

interface ChipGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
  error?: string | null;
  /** "list" shows full-width rows with a radio or checkbox, for short lists of longer labels. */
  layout?: 'chips' | 'list';
}

/** Selection is shown with a check icon and weight change, never by colour alone. */
export function ChipGroup<T extends string>({ label, options, selected, onToggle, multiple, error, layout = 'chips' }: ChipGroupProps<T>) {
  return (
    <View style={styles.group} accessibilityRole={multiple ? undefined : 'radiogroup'} accessibilityLabel={label}>
      <AppText variant="label" color={colors.inkMuted}>
        {label}
      </AppText>
      <View style={layout === 'list' ? styles.list : styles.wrap}>
        {options.map((o) => {
          const isOn = selected.includes(o.value);
          if (layout === 'list') {
            return (
              <Pressable
                key={o.value}
                onPress={() => onToggle(o.value)}
                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                accessibilityState={multiple ? { checked: isOn } : { selected: isOn }}
                accessibilityLabel={o.label}
                style={({ pressed }) => [styles.option, isOn && styles.optionOn, pressed && !isOn && { backgroundColor: colors.sunken }]}
              >
                <AppText variant={isOn ? 'bodyStrong' : 'body'} style={styles.flex}>
                  {o.label}
                </AppText>
                <View style={[multiple ? styles.box : styles.radio, isOn && styles.markOn]}>
                  {isOn ? multiple ? <Feather name="check" size={15} color={colors.inkInverse} /> : <View style={styles.dot} /> : null}
                </View>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={o.value}
              onPress={() => onToggle(o.value)}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={multiple ? { checked: isOn } : { selected: isOn }}
              accessibilityLabel={o.label}
              style={({ pressed }) => [styles.chip, isOn && styles.chipOn, pressed && !isOn && { backgroundColor: colors.sunken }]}
            >
              {isOn ? <Feather name="check" size={16} color={colors.inkInverse} /> : null}
              <AppText variant={isOn ? 'bodyStrong' : 'body'} color={isOn ? colors.inkInverse : colors.ink}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export function Stepper({ label, value, min, max, onChange, suffix }: StepperProps) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: `${value}${suffix ? ` ${suffix}` : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
    >
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
      <Pressable
        onPress={() => set(value - 1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        style={[styles.step, value <= min && styles.disabled]}
      >
        <Feather name="minus" size={20} color={colors.ink} />
      </Pressable>
      <AppText variant="heading" style={styles.value}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </AppText>
      <Pressable
        onPress={() => set(value + 1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        style={[styles.step, value >= max && styles.disabled]}
      >
        <Feather name="plus" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    minHeight: layout.minTouch - 4,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  list: { gap: space.xs },
  option: {
    minHeight: layout.minTouch + 8,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  optionOn: { borderColor: colors.ink },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  markOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.inkInverse },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch },
  step: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  value: { minWidth: 64, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  flex: { flex: 1 },
});
