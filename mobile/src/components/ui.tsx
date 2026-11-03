import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, type ThemeColor, SEMIBOLD } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color = 'text' }: { name: IconName; size?: number; color?: ThemeColor }) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={theme[color]} />;
}

/** A scrolling page with safe-area padding, a readable width and an optional large header. */
export function Screen({
  children,
  tabs = true,
  eyebrow,
  title,
  subtitle,
  accessory,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  tabs?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  accessory?: ReactNode;
  edges?: ('top' | 'left' | 'right' | 'bottom')[];
}) {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={edges}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (tabs ? BottomTabInset : 0) + Spacing.five }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          {(title || eyebrow) && (
            <View style={styles.header}>
              <View style={{ flex: 1, gap: Spacing.one }}>
                {eyebrow && <ThemedText type="eyebrow">{eyebrow}</ThemedText>}
                {title && (
                  <ThemedText type="title" accessibilityRole="header">
                    {title}
                  </ThemedText>
                )}
                {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
              </View>
              {accessory}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, padded && styles.cardPadding, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

/** A titled group of rows, like iOS settings. */
export function Section({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  return (
    <View style={{ gap: Spacing.two }}>
      {title && (
        <ThemedText type="eyebrow" style={{ paddingHorizontal: Spacing.one }}>
          {title}
        </ThemedText>
      )}
      <Card padded={false}>{children}</Card>
      {footer && (
        <ThemedText type="caption" style={{ paddingHorizontal: Spacing.one }}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, accessibilityHint }: ButtonProps) {
  const theme = useTheme();
  const off = disabled || loading;
  const bg = disabled
    ? theme.disabled
    : variant === 'primary'
      ? theme.accent
      : variant === 'ghost'
        ? 'transparent'
        : theme.backgroundSelected;
  const fg = disabled ? theme.disabledText : variant === 'primary' ? theme.accentText : variant === 'danger' ? theme.bad : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg }, pressed && styles.pressed]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <ThemedText style={[styles.buttonText, { color: fg }]}>{label}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/** A tappable list row with a leading icon tile, title, optional detail and trailing chevron or control. */
export function ListRow({
  icon,
  title,
  detail,
  onPress,
  trailing,
  last,
  tone = 'default',
}: {
  icon?: IconName;
  title: string;
  detail?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  last?: boolean;
  tone?: 'default' | 'danger';
}) {
  const theme = useTheme();
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name={icon} size={18} color={tone === 'danger' ? theme.bad : theme.text} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="heading" style={tone === 'danger' ? { color: theme.bad } : undefined}>
          {title}
        </ThemedText>
        {detail && <ThemedText type="caption">{detail}</ThemedText>}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} /> : null)}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail} onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: theme.backgroundSelected }}>
      {content}
    </Pressable>
  );
}

export function Pill({ label, icon }: { label: string; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
      {icon && <Ionicons name={icon} size={13} color={theme.textSecondary} />}
      <ThemedText type="caption" style={{ fontWeight: SEMIBOLD }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const theme = useTheme();
  const bg = tone === 'error' ? theme.badSoft : tone === 'success' ? theme.goodSoft : theme.backgroundSelected;
  const fg = tone === 'error' ? theme.bad : tone === 'success' ? theme.good : theme.textSecondary;
  const icon: IconName = tone === 'error' ? 'alert-circle' : tone === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={20} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>{typeof children === 'string' ? <ThemedText type="small">{children}</ThemedText> : children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.three + 4, paddingTop: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingTop: Spacing.three },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, overflow: 'hidden' },
  cardPadding: { padding: Spacing.four - 4, gap: Spacing.three - 4 },
  button: { minHeight: 52, borderRadius: Radius.md, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  buttonText: { fontWeight: SEMIBOLD, fontSize: 16 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2, minHeight: 60 },
  iconTile: { width: 36, height: 36, borderRadius: Radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  notice: { flexDirection: 'row', gap: Spacing.two + 2, borderRadius: Radius.md, padding: Spacing.three },
});
