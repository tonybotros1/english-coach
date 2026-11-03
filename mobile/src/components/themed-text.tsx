import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, SEMIBOLD, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'heading' | 'small' | 'smallBold' | 'caption' | 'eyebrow' | 'link' | 'number';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const fallback: ThemeColor = type === 'eyebrow' || type === 'caption' ? 'textSecondary' : 'text';
  return <Text style={[{ color: theme[themeColor ?? fallback] }, family, styles[type], style]} {...rest} />;
}

// Android keeps its default Roboto so every font weight renders; a named family there loses semibold.
const family = Platform.OS === 'android' ? null : { fontFamily: Fonts.sans };

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: SEMIBOLD },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: SEMIBOLD, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: 700, letterSpacing: -0.6 },
  subtitle: { fontSize: 22, lineHeight: 28, fontWeight: 700, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: SEMIBOLD, letterSpacing: -0.2 },
  link: { fontSize: 15, lineHeight: 22, fontWeight: SEMIBOLD, textDecorationLine: 'underline' },
  number: { fontSize: 40, lineHeight: 46, fontWeight: 700, letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
