import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Icon, ListRow, Pill, Screen, Section, type IconName } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/** A tab whose content arrives in a later phase. It shows what will be there, so the app never feels empty. */
export function ComingSoon({
  eyebrow,
  title,
  intro,
  phase,
  icon,
  features,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  phase: string;
  icon: IconName;
  features: { icon: IconName; title: string; detail: string }[];
}) {
  return (
    <Screen eyebrow={eyebrow} title={title}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Icon name={icon} size={28} />
          <Pill label={phase} icon="time-outline" />
        </View>
        <ThemedText themeColor="textSecondary" style={{ marginTop: Spacing.one }}>
          {intro}
        </ThemedText>
      </Card>
      <Section title="What you'll find here">
        {features.map((f, i) => (
          <ListRow key={f.title} icon={f.icon} title={f.title} detail={f.detail} last={i === features.length - 1} />
        ))}
      </Section>
    </Screen>
  );
}
