import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, Pill, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Strand, Task, TaskKind } from '@/lib/plan';

export const KIND_ICON: Record<TaskKind, IconName> = {
  review: 'layers-outline',
  weekly: 'repeat-outline',
  checkpoint: 'flag-outline',
  grammar: 'text-outline',
  vocabulary: 'book-outline',
  reading: 'reader-outline',
  listening: 'headset-outline',
  writing: 'create-outline',
  speaking: 'mic-outline',
};

export const STRAND_INFO: Record<Strand, { name: string; detail: string }> = {
  language: { name: 'Language study', detail: 'Grammar and vocabulary' },
  input: { name: 'Input', detail: 'Reading and listening' },
  output: { name: 'Output', detail: 'Writing' },
  fluency: { name: 'Fluency', detail: 'Speaking' },
};

/** One planned activity. `note` shows on the right, for example "Next update". */
export function TaskRow({ task, last, note, trailing }: { task: Task; last?: boolean; note?: string; trailing?: React.ReactNode }) {
  const theme = useTheme();
  const [kind, ...rest] = task.title.split(': ');
  const joined = rest.join(': ');
  const subtitle = joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : '';
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
      <View style={[styles.tile, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={KIND_ICON[task.kind]} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="heading">{subtitle ? kind : task.title}</ThemedText>
        {subtitle ? <ThemedText type="caption" numberOfLines={2}>{subtitle}</ThemedText> : null}
      </View>
      {trailing ?? (
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <ThemedText type="smallBold">{`${task.minutes} min`}</ThemedText>
          {note ? <Pill label={note} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2, minHeight: 64 },
  tile: { width: 36, height: 36, borderRadius: Radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
});
