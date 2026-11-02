import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/theme/tokens';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  header?: ReactNode;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Set when a parent (tab bar, stack header) already pads that edge. */
  edges?: { top?: boolean; bottom?: boolean };
  /** Drop the hairline above the footer, e.g. for a floating "next" arrow. */
  plainFooter?: boolean;
}

/** Safe-area aware page shell. Content is capped at a readable width on tablets and the web. */
export function Screen({ children, scroll, footer, header, background = colors.canvas, contentStyle, edges, plainFooter }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padTop = edges?.top === false ? 0 : insets.top;
  const padBottom = edges?.bottom === false ? 0 : insets.bottom;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: footer ? space.lg : padBottom + space.lg }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <View style={[styles.column, contentStyle]}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.column, contentStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background, paddingTop: padTop }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {header ? <View style={styles.column}>{header}</View> : null}
      {body}
      {footer ? (
        <View style={[styles.footer, plainFooter && styles.footerPlain, { paddingBottom: padBottom + space.sm, backgroundColor: background }]}>
          <View style={styles.column}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
  },
  footer: {
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  footerPlain: { borderTopWidth: 0 },
});
