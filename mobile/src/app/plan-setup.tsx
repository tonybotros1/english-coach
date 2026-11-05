import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, Screen } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { LEVELS, SECTION_INFO } from '@/lib/placement';
import { estimateWeeks, GOAL_INFO, planApi, type Goal, type SetupDefaults } from '@/lib/plan';
import { useSession } from '@/lib/session';

const GOALS: Goal[] = ['work', 'health', 'exam', 'daily'];
const MINUTES = [15, 30, 45, 60] as const;
const DAYS = [3, 4, 5, 6, 7];

function Choice({ label, detail, selected, onPress, flex }: { label: string; detail?: string; selected: boolean; onPress: () => void; flex?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        flex && { flex: 1 },
        { backgroundColor: selected ? theme.accent : theme.backgroundElement, borderColor: selected ? theme.accent : theme.border },
        pressed && !selected && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText style={{ fontWeight: SEMIBOLD, color: selected ? theme.accentText : theme.text, textAlign: 'center' }}>{label}</ThemedText>
      {detail ? (
        <ThemedText type="caption" style={{ color: selected ? theme.accentText : theme.textSecondary, opacity: selected ? 0.8 : 1, textAlign: 'center' }}>
          {detail}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.two + 2 }}>
      <View style={{ gap: 2 }}>
        <ThemedText type="heading">{title}</ThemedText>
        {hint ? <ThemedText type="caption">{hint}</ThemedText> : null}
      </View>
      {children}
    </View>
  );
}

export default function PlanSetupScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const params = useLocalSearchParams<{ goal?: Goal; target?: string; minutes?: string; days?: string }>();
  const [defaults, setDefaults] = useState<SetupDefaults | null>(null);
  const [goal, setGoal] = useState<Goal>((params.goal as Goal) || 'work');
  const [target, setTarget] = useState<number | null>(params.target ? Number(params.target) : null);
  const [minutes, setMinutes] = useState<number>(params.minutes ? Number(params.minutes) : 30);
  const [days, setDays] = useState<number>(params.days ? Number(params.days) : 5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    planApi
      .get(token)
      .then((r) => {
        setDefaults(r.setup);
        if (r.setup) setTarget((t) => (t && t >= r.setup!.minTarget ? t : r.setup!.target));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your results. Try again.'));
  }, [token]);

  if (!defaults) {
    return (
      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        {error ? <Notice tone="error">{error}</Notice> : <ActivityIndicator style={{ marginTop: Spacing.six }} />}
      </Screen>
    );
  }

  const t = target ?? defaults.target;
  const est = estimateWeeks(defaults.overall.score, t, minutes, days);
  const targets = LEVELS.map((_, i) => i).filter((i) => i >= Math.max(1, defaults.minTarget));
  const weakest = (Object.keys(defaults.skills) as (keyof typeof defaults.skills)[]).sort((a, b) => defaults.skills[a].score - defaults.skills[b].score).slice(0, 2);
  const months = Math.max(1, Math.round(est.weeks / 4.345));

  async function build() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await planApi.create(token, { goal, target: t, minutes: minutes as 15 | 30 | 45 | 60, days });
      router.dismissTo('/plan');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Your plan could not be built. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen
      tabs={false}
      edges={['left', 'right', 'bottom']}
      eyebrow={`Your level · ${defaults.overall.label}`}
      title="Build your plan"
      subtitle="Four choices. Your plan uses your test results to give your weakest skills the most time.">
      <Group title="What is English for?" hint="Lessons use topics and vocabulary for this goal.">
        <View style={styles.grid}>
          {GOALS.map((g) => (
            <Pressable
              key={g}
              accessibilityRole="radio"
              accessibilityState={{ checked: goal === g }}
              accessibilityLabel={GOAL_INFO[g].name}
              onPress={() => setGoal(g)}
              style={({ pressed }) => [
                styles.goal,
                { backgroundColor: goal === g ? theme.accent : theme.backgroundElement, borderColor: goal === g ? theme.accent : theme.border },
                pressed && goal !== g && { backgroundColor: theme.backgroundSelected },
              ]}>
              <Ionicons name={GOAL_INFO[g].icon} size={22} color={goal === g ? theme.accentText : theme.text} />
              <ThemedText style={{ fontWeight: SEMIBOLD, color: goal === g ? theme.accentText : theme.text }}>{GOAL_INFO[g].name}</ThemedText>
              <ThemedText type="caption" style={{ color: goal === g ? theme.accentText : theme.textSecondary, opacity: goal === g ? 0.8 : 1 }}>
                {GOAL_INFO[g].detail}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Group>

      <Group title="Target level" hint={`You are ${defaults.overall.label} now. ${LEVELS[defaults.target]}, one level up, is a realistic first goal.`}>
        <View style={styles.row}>
          {targets.map((i) => (
            <Choice key={i} label={LEVELS[i]} selected={t === i} onPress={() => setTarget(i)} flex />
          ))}
        </View>
      </Group>

      <Group title="Minutes a day">
        <View style={styles.row}>
          {MINUTES.map((m) => (
            <Choice key={m} label={`${m}`} detail="min" selected={minutes === m} onPress={() => setMinutes(m)} flex />
          ))}
        </View>
      </Group>

      <Group title="Days a week" hint="The last day each week is a review day. The rest are rest days.">
        <View style={styles.row}>
          {DAYS.map((d) => (
            <Choice key={d} label={`${d}`} selected={days === d} onPress={() => setDays(d)} flex />
          ))}
        </View>
      </Group>

      <Card>
        <ThemedText type="eyebrow">Your estimate</ThemedText>
        <ThemedText type="subtitle">{est.hours === 0 ? `You're already at ${LEVELS[t]}` : `About ${months} ${months === 1 ? 'month' : 'months'} to ${LEVELS[t]}`}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {(() => {
            const planHours = Math.round(((minutes * days) / 60) * 12);
            const base = `${(minutes * days) / 60} hours a week. Cambridge English estimates about 200 hours of guided study per level, so it takes about ${est.hours} hours from ${defaults.overall.label}.`;
            return `${base} ${planHours >= est.hours ? `Your 12-week plan gives you ${planHours} hours, enough to get there.` : `Your first 12 weeks cover ${planHours} of them.`}`;
          })()}
        </ThemedText>
        <View style={styles.focus}>
          <ThemedText type="smallBold">Most time goes to</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {weakest.map((k) => `${SECTION_INFO[k].name} (${defaults.skills[k].label})`).join(' and ')}
          </ThemedText>
        </View>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      <Button label="Build my 12-week plan" icon="checkmark" onPress={build} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  goal: { width: '48.5%', flexGrow: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, gap: 4 },
  row: { flexDirection: 'row', gap: Spacing.two },
  choice: { minHeight: 52, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  focus: { gap: 2, marginTop: Spacing.one },
});
