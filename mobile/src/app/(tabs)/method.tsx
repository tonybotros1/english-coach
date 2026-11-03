import { Linking } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, ListRow, Screen, Section, type IconName } from '@/components/ui';

const PRINCIPLES: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'flag-outline', title: 'Find your real level', detail: 'An adaptive test steps up or down until it finds your ceiling in each skill' },
  { icon: 'locate-outline', title: 'Target the gaps', detail: 'Weaker skills get more minutes every week' },
  { icon: 'layers-outline', title: 'Remember what you learn', detail: 'Mistakes come back after 1, 2, 4, 8, 16 and 32 days' },
  { icon: 'trending-up-outline', title: 'Measure and adjust', detail: 'A checkpoint test every 4 weeks rebuilds your plan' },
];

const SOURCES = [
  { title: 'CEFR levels A1 to C2', by: 'Council of Europe, 2020', url: 'https://www.coe.int/en/web/common-european-framework-reference-languages' },
  { title: 'Guided learning hours', by: 'Cambridge University Press & Assessment', url: 'https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours' },
  { title: 'Adaptive placement testing', by: 'Oxford Placement Test, Oxford University Press', url: 'https://en.wikipedia.org/wiki/Oxford_Placement_Test' },
  { title: 'IELTS and TOEFL on the CEFR', by: 'IELTS partners and ETS', url: 'https://www.ielts.org/about-ielts/ielts-in-cefr-scale' },
  { title: 'Effective learning techniques', by: 'Dunlosky and colleagues, 2013', url: 'https://doi.org/10.1177/1529100612453266' },
  { title: 'The four strands', by: 'Paul Nation, Victoria University of Wellington', url: 'https://core.ac.uk/download/357330216.pdf' },
  { title: 'Pronunciation assessment', by: 'Microsoft Azure AI Speech', url: 'https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment' },
];

export default function MethodScreen() {
  return (
    <Screen eyebrow="Method" title="How it works" subtitle="Every part of the app comes from published frameworks and learning research.">
      <Section title="Principles">
        {PRINCIPLES.map((p, i) => (
          <ListRow key={p.title} icon={p.icon} title={p.title} detail={p.detail} last={i === PRINCIPLES.length - 1} />
        ))}
      </Section>
      <Section
        title="Sources"
        footer="The placement test is an estimate for planning. For a certificate, take an official exam such as IELTS, TOEFL or Cambridge English.">
        {SOURCES.map((s, i) => (
          <ListRow
            key={s.title}
            icon="document-text-outline"
            title={s.title}
            detail={s.by}
            onPress={() => Linking.openURL(s.url)}
            trailing={<Icon name="open-outline" size={18} color="textTertiary" />}
            last={i === SOURCES.length - 1}
          />
        ))}
      </Section>
      <ThemedText type="caption" style={{ textAlign: 'center' }}>
        Tony&apos;s English Coach · Phase 1
      </ThemedText>
    </Screen>
  );
}
