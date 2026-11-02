import { Text, type TextProps } from 'react-native';
import { colors, type, type TypeVariant } from '@/theme/tokens';

interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', color = colors.ink, align, style, ...rest }: AppTextProps) {
  const isDisplay = variant === 'hero' || variant === 'display' || variant === 'title';
  return (
    <Text
      maxFontSizeMultiplier={isDisplay ? 1.4 : 1.8}
      accessibilityRole={isDisplay ? 'header' : undefined}
      {...rest}
      style={[type[variant], { color, textAlign: align }, style]}
    />
  );
}
