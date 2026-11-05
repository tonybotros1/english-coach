import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ListRow, Pill, Screen, Section, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { placementApi, SECTION_INFO, type Step, type Summary } from '@/lib/placement';
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
  const { user, token } = useSession();
  const name = user?.name || user?.email.split('@')[0] || '';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const [active, setActive] = useState<Step | null>(null);
  const [latest, setLatest] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      placementApi
        .status(token)
        .then((r) => {
          setActive(r.active);
          setLatest(r.latest);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    }, [token]),
  );

  const resumable = active && active.kind !== 'done' ? active : null;
  const current = latest ? 1 : 0;

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
      {latest && !resumable ? (
        <Card>
          <View style={styles.cardTop}>
            <Pill label="Your level" icon="flag-outline" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three }}>
            <ThemedText style={styles.level}>{latest.overall.label}</ThemedText>
            <ThemedText type="caption" style={{ marginBottom: 8 }}>{`Tested ${new Date(latest.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">Your personal plan, built from these results, arrives in the next update.</ThemedText>
          <Button label="See your results" variant="secondary" onPress={() => router.push({ pathname: '/placement/results/[id]', params: { id: latest.testId } })} />
        </Card>
      ) : (
        <Card>
          <View style={styles.cardTop}>
            <Pill label={resumable ? 'In progress' : 'Next up'} icon={resumable ? 'pause' : 'arrow-forward'} />
            <Pill label={resumable ? `Part ${resumable.sectionIndex + 1} of 6` : '30 min'} icon="time-outline" />
          </View>
          <ThemedText type="subtitle">Placement test</ThemedText>
          {resumable ? (
            <>
              <ThemedText themeColor="textSecondary">{`Your answers are saved. Pick up where you left off, in ${SECTION_INFO[resumable.section].name.toLowerCase()}.`}</ThemedText>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View style={{ width: `${Math.max(3, Math.round(resumable.progress * 100))}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
              </View>
              <Button label="Continue the test" icon="play" onPress={() => router.push('/placement/test')} />
            </>
          ) : (
            <>
              <ThemedText themeColor="textSecondary">
                Six short parts: grammar, vocabulary, reading, listening, writing and speaking. The questions adapt to you, and you get a
                CEFR level from A1 to C2 with matching IELTS, TOEFL and Cambridge scores.
              </ThemedText>
              <Button label="Start the placement test" icon="arrow-forward" onPress={() => router.push('/placement')} disabled={!loaded} loading={!loaded} />
            </>
          )}
        </Card>
      )}

      <Section title="Your path">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <View key={s.title} style={[styles.step, i < STEPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
              <View style={[styles.stepDot, { backgroundColor: active || done ? theme.accent : theme.backgroundSelected }]}>
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
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  level: { fontSize: 48, lineHeight: 54, fontWeight: 700, letterSpacing: -1.5 },
  stepDot: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
