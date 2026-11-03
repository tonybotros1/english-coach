/**
 * English Coach design tokens.
 * Grey is the main colour (backgrounds, surfaces, secondary controls) and black the
 * secondary, accent colour (text, primary actions, selection). Dark mode inverts it.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A0A0B',
    textSecondary: '#6B6B73',
    textTertiary: '#A1A1A8',
    background: '#F2F2F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E6E6E9',
    border: '#E4E4E7',
    borderStrong: '#D0D0D5',
    accent: '#0A0A0B',
    accentText: '#FFFFFF',
    disabled: '#E6E6E9',
    disabledText: '#A1A1A8',
    good: '#1F7A4D',
    goodSoft: '#EAF5EF',
    bad: '#B42318',
    badSoft: '#FCEDEC',
  },
  dark: {
    text: '#F5F5F6',
    textSecondary: '#A1A1A8',
    textTertiary: '#6B6B73',
    background: '#0A0A0B',
    backgroundElement: '#17171A',
    backgroundSelected: '#26262A',
    border: '#26262A',
    borderStrong: '#3A3A40',
    accent: '#F5F5F6',
    accentText: '#0A0A0B',
    disabled: '#26262A',
    disabledText: '#6B6B73',
    good: '#5BC98F',
    goodSoft: '#132A1E',
    bad: '#F2867A',
    badSoft: '#331715',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 640;

/** Android's default Roboto only switches to a heavier face at 700, so semibold maps to bold there. */
export const SEMIBOLD = Platform.OS === 'android' ? 700 : 600;
