import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps, type TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import type { IconName } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

const TABS: { name: string; href: '/' | '/plan' | '/practice' | '/progress' | '/method'; label: string; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', href: '/', label: 'Today', icon: 'sunny-outline', iconOn: 'sunny' },
  { name: 'plan', href: '/plan', label: 'Plan', icon: 'map-outline', iconOn: 'map' },
  { name: 'practice', href: '/practice', label: 'Practice', icon: 'chatbubbles-outline', iconOn: 'chatbubbles' },
  { name: 'progress', href: '/progress', label: 'Progress', icon: 'stats-chart-outline', iconOn: 'stats-chart' },
  { name: 'method', href: '/method', label: 'Method', icon: 'book-outline', iconOn: 'book' },
];

/** Tab bar for the web preview, matching the native one. */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton icon={t.icon} iconOn={t.iconOn}>
                {t.label}
              </TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, icon, iconOn, ...props }: TabTriggerSlotProps & { icon: IconName; iconOn: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textTertiary;
  return (
    <Pressable {...(props as PressableProps)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Ionicons name={isFocused ? iconOn : icon} size={22} color={color} />
      <ThemedText type="caption" style={{ color: isFocused ? theme.accent : theme.textSecondary, fontWeight: isFocused ? 600 : 500 }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  return (
    <View {...props} style={[styles.bar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth },
  inner: { flexDirection: 'row', justifyContent: 'space-around', maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  tab: { alignItems: 'center', gap: 2, paddingVertical: Spacing.two + 2, paddingHorizontal: Spacing.two, minWidth: 64 },
  pressed: { opacity: 0.6 },
});
