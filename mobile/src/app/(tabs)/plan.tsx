import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/coming-soon';
import { STRAND_INFO, TaskRow } from '@/components/plan/task-row';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, Pill, Screen, Section } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { LEVELS, SECTION_INFO } from '@/lib/placement';
import { planApi, type Day, type PlanView, type SetupDefaults, type Strand } from '@/lib/plan';
import { useSession } from '@/lib/session';

const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
const DAY_LABEL: Record<Day['type'], string> = { study: 'Study day', review: 'Review day', checkpoint: 'Checkpoint', rest: 'Rest day' };

export default function PlanScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [setup, setSetup] = useState<SetupDefaults | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      planApi
        .get(token)
        .then((r) => {
          setPlan(r.plan);
          setSetup(r.setup);
          setError(null);
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your plan. Try again.'))
        .finally(() => setLoaded(true));
    }, [token]),
  );

  if (!loaded) {
    return (
      <Screen eyebrow="Plan" title="Your 12-week plan">
        {error ? <Notice tone="error">{error}</Notice> : <ActivityIndicator />}
      </Screen>
    );
  }

  if (!plan && !setup) {
    return (
      <ComingSoon
        eyebrow="Plan"
        title="Your 12-week plan"
        icon="map-outline"
        phase="After your test"
        intro="Take the placement test first. Your plan is built from your results, so it gives more time to your weakest skills."
        features={[
          { icon: 'flag-outline', title: 'Target and timeline', detail: 'Based on about 200 study hours per CEFR level' },
          { icon: 'calendar-outline', title: 'Week by week', detail: 'A clear focus for each week and each day' },
          { icon: 'git-compare-outline', title: 'Balanced practice', detail: 'Input, output, language study and fluency' },
          { icon: 'refresh-outline', title: 'Checkpoints', detail: 'A short retest every 4 weeks' },
        ]}
      />
    );
  }

  if (!plan && setup) {
    return (
      <Screen eyebrow="Plan" title="Your 12-week plan">
        <Card>
          <Pill label={`Your level · ${setup.overall.label}`} icon="flag-outline" />
          <ThemedText type="subtitle">Ready to build your plan</ThemedText>
          <ThemedText themeColor="textSecondary">
            Choose your goal, target level and how much time you have. The plan gives the most time to your weakest skills and balances reading,
            listening, writing, speaking, grammar and vocabulary.
          </ThemedText>
          <Button label="Build my plan" icon="arrow-forward" onPress={() => router.push('/plan-setup')} />
        </Card>
      </Screen>
    );
  }

  const p = plan!;
  const selected = week ?? Math.min(p.today.weekIndex, p.weeks.length - 1);
  const w = p.weeks[selected];
  const strandTotal = Object.values(p.strands).reduce((a, b) => a + b, 0) || 1;
  const s = p.settings;
  const current = LEVELS[Math.floor(p.overall + 1e-9)];

  return (
    <Screen
      eyebrow={`12-week plan · ${p.goalName}`}
      title={`${current} to ${LEVELS[s.target]}`}
      subtitle={`${s.minutes} minutes a day, ${s.days} days a week. Ends ${new Date(`${p.endDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.`}>
      <Card>
        <ThemedText type="eyebrow">Time to {LEVELS[s.target]}</ThemedText>
        <ThemedText type="subtitle">{p.estimate.hours === 0 ? 'You are at your target' : `About ${p.estimate.months} ${p.estimate.months === 1 ? 'month' : 'months'}`}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {`${p.estimate.hoursPerWeek} hours a week. Cambridge English estimates about 200 hours of guided study per level, so you need about ${p.estimate.hours}. These 12 weeks give you ${p.estimate.planHours}${p.estimate.planHours >= p.estimate.hours ? ', enough to get there' : ''}, and a checkpoint every 4 weeks measures your progress.`}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
          {p.focusSkills.map((k) => (
            <Pill key={k} label={`More ${SECTION_INFO[k].name.toLowerCase()}`} icon={SECTION_INFO[k].icon} />
          ))}
        </View>
      </Card>

      <Section title="Balance of practice" footer="Paul Nation's four strands: good courses give each about a quarter of lesson time. Review cards come on top.">
        {(Object.keys(STRAND_INFO) as Strand[]).map((k, i, all) => {
          const pct = Math.round((p.strands[k] / strandTotal) * 100);
          return (
            <View key={k} style={[styles.strand, i < all.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText type="heading">
                  {STRAND_INFO[k].name}
                  <ThemedText type="caption">{`  ${STRAND_INFO[k].detail}`}</ThemedText>
                </ThemedText>
                <ThemedText type="smallBold">{`${pct}%`}</ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View style={{ width: `${pct}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
              </View>
            </View>
          );
        })}
      </Section>

      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow" style={{ paddingHorizontal: Spacing.one }}>
          Week by week
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingVertical: 2 }}>
          {p.weeks.map((x, i) => {
            const on = i === selected;
            const now = i === p.today.weekIndex && p.today.status === 'active';
            return (
              <Pressable
                key={x.n}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Week ${x.n}${now ? ', this week' : ''}`}
                onPress={() => setWeek(i)}
                style={[styles.weekChip, { backgroundColor: on ? theme.accent : theme.backgroundElement, borderColor: on ? theme.accent : now ? theme.borderStrong : theme.border }]}>
                <ThemedText style={{ fontWeight: SEMIBOLD, color: on ? theme.accentText : theme.text }}>{`W${x.n}`}</ThemedText>
                {now && <View style={[styles.nowDot, { backgroundColor: on ? theme.accentText : theme.accent }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
        <ThemedText type="small" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.one }}>{`Focus: ${w.focus}`}</ThemedText>
      </View>

      {w.days.map((d, di) => {
        const isToday = d.date === p.today.date;
        return (
          <Section key={d.date} title={`${weekday(d.date)}${isToday ? ' · Today' : ''} · ${DAY_LABEL[d.type]}`}>
            {d.tasks.length ? (
              d.tasks.map((t, i) => <TaskRow key={t.id} task={t} last={i === d.tasks.length - 1} />)
            ) : (
              <View style={styles.rest}>
                <ThemedText type="small" themeColor="textSecondary">
                  {di === 6 || d.type === 'rest' ? 'A day off. Rest helps you remember what you learned.' : ''}
                </ThemedText>
              </View>
            )}
          </Section>
        );
      })}

      <Button
        label="Change my plan"
        variant="secondary"
        icon="options-outline"
        onPress={() => router.push({ pathname: '/plan-setup', params: { goal: s.goal, target: String(s.target), minutes: String(s.minutes), days: String(s.days) } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  strand: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2, gap: 8 },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  weekChip: { minWidth: 52, height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
  nowDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  rest: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
});
