import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LessonDone, McqPractice, StepHeader } from '@/components/lessons/shared';
import { ListeningPlayer } from '@/components/placement/listening-player';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, Screen } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import type { LessonResult } from '@/lib/lessons';
import { planApi, type CardCounts } from '@/lib/plan';
import { progressApi, type WeeklyView } from '@/lib/progress';
import { useSession } from '@/lib/session';

export default function WeeklyReviewScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [weekly, setWeekly] = useState<WeeklyView | null>(null);
  const [cards, setCards] = useState<CardCounts | null>(null);
  const [step, setStep] = useState<'cards' | 'quiz'>('cards');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const started = useRef<number | null>(null);

  useEffect(() => {
    started.current = Date.now();
  }, []);
  useEffect(() => {
    if (!token || !taskId) return;
    progressApi
      .openWeekly(token, taskId)
      .then((r) => setWeekly(r.weekly))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'The weekly review could not be loaded. Try again.'));
  }, [token, taskId]);
  // Card counts refresh when coming back from a review session.
  useFocusEffect(
    useCallback(() => {
      if (token) planApi.today(token).then((t) => setCards(t.cards)).catch(() => {});
    }, [token]),
  );

  async function finish(answers: number[]) {
    if (!token || !taskId) return;
    setBusy(true);
    setError(null);
    try {
      const seconds = started.current ? Math.round((Date.now() - started.current) / 1000) : 0;
      setWeekly((await progressApi.completeWeekly(token, taskId, answers, seconds)).weekly);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Your answers could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const due = cards ? cards.due + cards.newToday : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <View style={styles.barInner}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close} style={styles.close}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold">{weekly ? `Weekly review · week ${weekly.week}` : 'Weekly review'}</ThemedText>
        </View>
      </View>
      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        {!weekly && !error && <ActivityIndicator style={{ marginTop: Spacing.six }} />}
        {error && <Notice tone="error">{error}</Notice>}

        {weekly?.status === 'completed' && weekly.result && (
          <LessonDone result={{ ...weekly.result, dictation: null, writing: null, speaking: null } as LessonResult}>
            <ThemedText themeColor="textSecondary">Questions you missed are now review cards, so they come back until you know them.</ThemedText>
          </LessonDone>
        )}

        {weekly?.status === 'ready' && step === 'cards' && (
          <View style={{ gap: Spacing.four }}>
            <StepHeader step={0} steps={2} title="Review cards" />
            <ThemedText type="title">This week, once more</ThemedText>
            <ThemedText themeColor="textSecondary">
              {weekly.questions.length
                ? `First your review cards, then a ${weekly.questions.length}-question quiz from this week's ${weekly.lessonsDone} ${weekly.lessonsDone === 1 ? 'lesson' : 'lessons'}, mixing questions you missed with ones you got right.`
                : "You didn't finish any lessons with questions this week, so there is no quiz. Review your cards, then mark the week as reviewed."}
            </ThemedText>
            <Card>
              <ThemedText type="heading">{due ? `${due} ${due === 1 ? 'card' : 'cards'} ready` : 'No cards due right now'}</ThemedText>
              {due > 0 && <Button label="Review cards" icon="layers-outline" variant="secondary" onPress={() => router.push('/review')} />}
            </Card>
            {weekly.questions.length ? (
              <Button label="Start the quiz" icon="arrow-forward" onPress={() => setStep('quiz')} />
            ) : (
              <Button label="Mark the week as reviewed" icon="checkmark" onPress={() => finish([])} loading={busy} />
            )}
          </View>
        )}

        {weekly?.status === 'ready' && step === 'quiz' && (
          <View style={{ gap: Spacing.four }}>
            <StepHeader step={1} steps={2} title="Quiz" />
            <McqPractice
              questions={weekly.questions}
              onDone={finish}
              busy={busy}
              header={(i) => {
                const q = weekly.questions[i];
                return (
                  <View style={{ gap: Spacing.two }}>
                    {q.lines && <ListeningPlayer key={`w-${i}`} lines={q.lines} maxPlays={3} />}
                    {q.passage && (
                      <>
                        <Pressable accessibilityRole="button" onPress={() => setShowText((v) => !v)}>
                          <ThemedText type="link">{showText ? 'Hide the text' : `Show the text: ${q.passage.title}`}</ThemedText>
                        </Pressable>
                        {showText && (
                          <Card>
                            {q.passage.text.split(/\n\n+/).map((p, j) => (
                              <ThemedText key={j} type="small" style={{ lineHeight: 22 }}>
                                {p}
                              </ThemedText>
                            ))}
                          </Card>
                        )}
                      </>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three + 4, paddingVertical: Spacing.three - 4 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', minHeight: 36 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
