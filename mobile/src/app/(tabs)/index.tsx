import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { LESSON_KINDS, TaskRow } from '@/components/plan/task-row';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ListRow, Notice, Pill, Screen, Section, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { LEVELS, SECTION_INFO } from '@/lib/placement';
import { planApi, type TodayView } from '@/lib/plan';
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
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const [today, setToday] = useState<TodayView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      planApi
        .today(token)
        .then((r) => {
          setToday(r);
          setError(null);
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load today. Pull down or try again.'));
    }, [token]),
  );

  const latest = today?.placement.latest ?? null;
  const active = today?.placement.active && today.placement.active.kind !== 'done' ? today.placement.active : null;
  const plan = today?.plan ?? null;
  const cards = today?.cards;
  const toReview = cards ? cards.due + cards.newToday : 0;
  const current = plan ? 2 : latest ? 1 : 0;

  return (
    <Screen
      eyebrow={plan && plan.status === 'active' ? `${dateLabel} · Week ${plan.week} of ${plan.weeks}` : dateLabel}
      title={`${greeting()}${name ? `, ${name}` : ''}`}
      accessory={
        <Pressable accessibilityRole="button" accessibilityLabel="Your account" onPress={() => router.navigate('/progress')} style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <ThemedText style={{ color: theme.accentText, fontWeight: 700, fontSize: 16 }}>{(name || '?').charAt(0).toUpperCase()}</ThemedText>
        </Pressable>
      }>
      {!today && !error && <ActivityIndicator />}
      {error && <Notice tone="error">{error}</Notice>}

      {today && active && (
        <Card>
          <View style={styles.cardTop}>
            <Pill label="In progress" icon="pause" />
            <Pill label={`Part ${active.sectionIndex + 1} of 6`} icon="time-outline" />
          </View>
          <ThemedText type="subtitle">{latest ? 'Placement retake' : 'Placement test'}</ThemedText>
          <ThemedText themeColor="textSecondary">{`Your answers are saved. Pick up where you left off, in ${SECTION_INFO[active.section].name.toLowerCase()}.`}</ThemedText>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View style={{ width: `${Math.max(3, Math.round(active.progress * 100))}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
          </View>
          <Button label="Continue the test" icon="play" onPress={() => router.push('/placement/test')} />
        </Card>
      )}

      {today && !latest && !active && (
        <Card>
          <View style={styles.cardTop}>
            <Pill label="Next up" icon="arrow-forward" />
            <Pill label="30 min" icon="time-outline" />
          </View>
          <ThemedText type="subtitle">Placement test</ThemedText>
          <ThemedText themeColor="textSecondary">
            Six short parts: grammar, vocabulary, reading, listening, writing and speaking. The questions adapt to you, and you get a CEFR level from A1 to C2
            with matching IELTS, TOEFL and Cambridge scores.
          </ThemedText>
          <Button label="Start the placement test" icon="arrow-forward" onPress={() => router.push('/placement')} />
        </Card>
      )}

      {today && latest && !plan && (
        <Card>
          <View style={styles.cardTop}>
            <Pill label={`Your level · ${latest.overall.label}`} icon="flag-outline" />
          </View>
          <ThemedText type="subtitle">Build your plan</ThemedText>
          <ThemedText themeColor="textSecondary">Four quick choices turn your results into a 12-week plan, with the most time for your weakest skills.</ThemedText>
          <Button label="Build my plan" icon="arrow-forward" onPress={() => router.push('/plan-setup')} />
          <Button label="See your results" variant="ghost" onPress={() => router.push({ pathname: '/placement/results/[id]', params: { id: latest.testId } })} />
        </Card>
      )}

      {today && cards && cards.total > 0 && (
        <Card>
          <View style={styles.reviewHead}>
            <View style={[styles.reviewIcon, { backgroundColor: toReview ? theme.accent : theme.backgroundSelected }]}>
              <Icon name={toReview ? 'layers' : 'checkmark'} size={22} color={toReview ? 'accentText' : 'text'} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="subtitle">{toReview ? 'Review cards' : 'Cards done'}</ThemedText>
              <ThemedText type="caption">
                {toReview
                  ? [cards.due ? `${cards.due} due` : null, cards.newToday ? `${cards.newToday} new` : null].filter(Boolean).join(' · ')
                  : cards.reviewedToday
                    ? `Nothing due right now. ${cards.reviewedToday} ${cards.reviewedToday === 1 ? 'review' : 'reviews'} done today.`
                    : 'Nothing due right now.'}
              </ThemedText>
            </View>
            {toReview > 0 && <ThemedText type="number" style={{ fontSize: 32, lineHeight: 36 }}>{toReview}</ThemedText>}
          </View>
          {toReview > 0 && <Button label="Start review" icon="play" onPress={() => router.push('/review')} />}
          {toReview > 0 && cards.reviewedToday === 0 && (
            <ThemedText type="caption">Your test mistakes come back as cards, a few new ones each day, until you know them.</ThemedText>
          )}
        </Card>
      )}

      {plan && plan.status === 'active' && (
        <Section
          title={`Today's plan · ${plan.tasks.reduce((a, t) => a + t.minutes, 0)} min`}
          footer={
            plan.dayType === 'rest'
              ? undefined
              : 'Start with your review cards, then do the lessons in any order. Weekly reviews and checkpoints arrive in the next update.'
          }>
          {plan.dayType === 'rest' || plan.tasks.length === 0 ? (
            <View style={styles.rest}>
              <ThemedText type="heading">Rest day</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Rest helps your memory. If cards are due, a quick review still counts.
              </ThemedText>
            </View>
          ) : (
            plan.tasks.map((t, i) => {
              const lesson = LESSON_KINDS.includes(t.kind);
              const done = t.kind === 'review' ? cards?.reviewedToday ? toReview === 0 : false : plan.done.includes(t.id);
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  last={i === plan.tasks.length - 1}
                  done={done}
                  note={lesson || t.kind === 'review' ? (done ? 'Done' : undefined) : 'Next update'}
                  onPress={lesson ? () => router.push({ pathname: '/lesson/[taskId]', params: { taskId: t.id } }) : t.kind === 'review' && toReview ? () => router.push('/review') : undefined}
                />
              );
            })
          )}
        </Section>
      )}

      {plan && plan.status === 'ended' && (
        <Notice>{`Your 12 weeks are complete. Retake the placement test to measure your progress and build your next plan towards ${LEVELS[Math.min(6, plan.target + 1)]}.`}</Notice>
      )}

      <Section title="Your path">
        {STEPS.map((s, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <View key={s.title} style={[styles.step, i < STEPS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
              <View style={[styles.stepDot, { backgroundColor: on || done ? theme.accent : theme.backgroundSelected }]}>
                {done ? (
                  <Icon name="checkmark" size={16} color="accentText" />
                ) : (
                  <ThemedText style={{ fontWeight: 700, fontSize: 14, color: on ? theme.accentText : theme.textSecondary }}>{i + 1}</ThemedText>
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="heading" themeColor={on ? 'text' : 'textSecondary'}>
                  {s.title}
                </ThemedText>
                <ThemedText type="caption">{s.detail}</ThemedText>
              </View>
              <Icon name={s.icon} size={20} color={on ? 'text' : 'textTertiary'} />
            </View>
          );
        })}
      </Section>

      <Section title="More">
        {latest && (
          <ListRow
            icon="ribbon-outline"
            title="Your placement results"
            detail={`${latest.overall.label} · tested ${new Date(latest.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            onPress={() => router.push({ pathname: '/placement/results/[id]', params: { id: latest.testId } })}
          />
        )}
        <ListRow icon="mic-outline" title="Voice check" detail="Test your microphone with one sentence" onPress={() => router.push('/voice-check')} last />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cardTop: { flexDirection: 'row', gap: Spacing.two },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  reviewIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rest: { padding: Spacing.three, gap: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2 },
  stepDot: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
