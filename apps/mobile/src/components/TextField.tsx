import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, fonts, layout, radius, space } from '@/theme/tokens';
import { AppText } from './AppText';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  helper?: string;
  error?: string | null;
  showCount?: boolean;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, helper, error, showCount, maxLength, value, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const count = value?.length ?? 0;
  const borderColor = error ? colors.danger : focused ? colors.ink : colors.line;
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.inkMuted} nativeID={`${label}-label`}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        value={value}
        maxLength={maxLength}
        multiline={multiline}
        placeholderTextColor={colors.inkSubtle}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        accessibilityLabel={label}
        accessibilityHint={error ?? helper}
        aria-invalid={!!error}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline && styles.multiline, { borderColor }]}
        {...rest}
      />
      <View style={styles.meta}>
        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.flex} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : helper ? (
          <AppText variant="caption" color={colors.inkMuted} style={styles.flex}>
            {helper}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        {showCount && maxLength ? (
          <AppText variant="caption" color={count >= maxLength ? colors.danger : colors.inkMuted}>
            {count}/{maxLength}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: layout.minTouch + 6,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  meta: { flexDirection: 'row', gap: space.sm, minHeight: 18 },
  flex: { flex: 1 },
});
