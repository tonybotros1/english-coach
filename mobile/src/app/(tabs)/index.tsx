import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ListRow, Pill, Screen, Section, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

const STEPS: { title: string; detail: string; icon: IconName }[] = [
  { title: 'Find your level', detail: 'A 30-minute adaptive placement test', icon: 'flag-outline' },
  { title: 'Get your plan', detail: '12 weeks, focused on your weakest skills', icon: 'map-outline' },
  { title: 'Practise every day', detail: 'Short sessions with a morning reminder', icon: 'repeat-outline' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function TodayScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const name = user?.name || 'Tony';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const current = 0;

  return (
    <Screen
      eyebrow={today}
      title={`${greeting()}, ${name}`}
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your account"
          onPress={() => router.navigate('/progress')}
          style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <ThemedText style={{ color: theme.accentText, fontWeight: 700, fontSize: 16 }}>{name.charAt(0).toUpperCase()}</ThemedText>
        </Pressable>
      }>
      <Card>
        <View style={styles.cardTop}>
          <Pill label="Next up" icon="arrow-forward" />
          <Pill label="30 min" icon="time-outline" />
        </View>
        <ThemedText type="subtitle">Placement test</ThemedText>
        <ThemedText themeColor="textSecondary">
          Six short parts: grammar, vocabulary, reading, listening, writing and speaking. The questions adapt to you, and you get a
          CEFR level from A1 to C2 with matching IELTS, TOEFL and Cambridge scores.
        </ThemedText>
        <Button label="Available in the next update" onPress={() => {}} disabled />
      </Card>

      <Section title="Your path">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <View key={s.title} style={[styles.step, i < STEPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
              <View style={[styles.stepDot, { backgroundColor: active ? theme.accent : theme.backgroundSelected }]}>
                {done ? (
                  <Icon name="checkmark" size={16} color="accentText" />
                ) : (
                  <ThemedText style={{ fontWeight: 700, fontSize: 14, color: active ? theme.accentText : theme.textSecondary }}>{i + 1}</ThemedText>
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="heading" themeColor={active ? 'text' : 'textSecondary'}>
                  {s.title}
                </ThemedText>
                <ThemedText type="caption">{s.detail}</ThemedText>
              </View>
              <Icon name={s.icon} size={20} color={active ? 'text' : 'textTertiary'} />
            </View>
          );
        })}
      </Section>

      <Section title="Before you start" footer="The speaking part of the test uses your microphone. Check it works first.">
        <ListRow icon="mic-outline" title="Voice check" detail="Record one sentence, about 20 seconds" onPress={() => router.push('/voice-check')} last />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cardTop: { flexDirection: 'row', gap: Spacing.two },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2 },
  stepDot: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
