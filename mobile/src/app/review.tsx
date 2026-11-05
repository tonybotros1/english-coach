import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListeningPlayer } from '@/components/placement/listening-player';
import { GapSentence } from '@/components/placement/steps';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, Pill, Screen } from '@/components/ui';
import { MaxContentWidth, Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { SECTION_INFO, type Section } from '@/lib/placement';
import { planApi, type CardCounts, type ReviewCard } from '@/lib/plan';
import { useSession } from '@/lib/session';

type Rating = 1 | 2 | 3 | 4;
const RATINGS: { rating: Rating; label: string; key: keyof ReviewCard['intervals'] }[] = [
  { rating: 1, label: 'Again', key: 'again' },
  { rating: 2, label: 'Hard', key: 'hard' },
  { rating: 3, label: 'Good', key: 'good' },
  { rating: 4, label: 'Easy', key: 'easy' },
];

const skillName = (s: string) => (s in SECTION_INFO ? SECTION_INFO[s as Section].name : 'Review');

export default function ReviewScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [counts, setCounts] = useState<CardCounts | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showText, setShowText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  // The latest rating of each card, so the summary counts cards rather than reviews.
  const [lastRating, setLastRating] = useState<Record<string, Rating>>({});
  const [startSize, setStartSize] = useState(0);

  useEffect(() => {
    if (!token) return;
    planApi
      .session(token)
      .then((r) => {
        setQueue(r.cards);
        setCounts(r.counts);
        setStartSize(r.cards.length);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Your cards could not be loaded. Try again.'));
    return () => {
      Speech.stop();
    };
  }, [token]);

  const card = queue?.[0] ?? null;

  async function rate(rating: Rating) {
    if (!card || !token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await planApi.review(token, card.id, rating, card.reps);
      setDone((n) => n + 1);
      setLastRating((m) => ({ ...m, [card.id]: rating }));
      // A forgotten card comes back later in this session, after a few others.
      setQueue((q) => {
        const rest = (q ?? []).slice(1);
        if (!r.soon) return rest;
        const at = Math.min(rest.length, 3);
        return [...rest.slice(0, at), r.card, ...rest.slice(at)];
      });
      setRevealed(false);
      setShowText(false);
      Speech.stop();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setQueue((q) => (q ?? []).slice(1));
        setRevealed(false);
      } else {
        setError(e instanceof ApiError ? e.message : 'Your answer could not be saved. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    Speech.stop();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!queue) {
    return (
      <Screen tabs={false} edges={['top', 'left', 'right', 'bottom']}>
        {error ? (
          <View style={{ gap: Spacing.three, paddingTop: Spacing.six }}>
            <Notice tone="error">{error}</Notice>
            <Button label="Back" variant="secondary" onPress={close} />
          </View>
        ) : (
          <ActivityIndicator style={{ marginTop: Spacing.six * 2 }} />
        )}
      </Screen>
    );
  }

  if (!card) {
    const nothing = startSize === 0;
    return (
      <Screen tabs={false} edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ gap: Spacing.four, paddingTop: Spacing.six }}>
          <View style={[styles.doneIcon, { backgroundColor: theme.accent }]}>
            <Ionicons name="checkmark" size={34} color={theme.accentText} />
          </View>
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="title" accessibilityRole="header">
              {nothing ? 'All caught up' : 'Done for today'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {nothing
                ? counts && counts.total === 0
                  ? 'You have no review cards yet. Mistakes from your test and lessons become cards automatically.'
                  : 'No cards are due right now. Come back tomorrow, when the next ones are ready.'
                : (() => {
                    const ratings = Object.values(lastRating);
                    const n = ratings.length;
                    const knew = ratings.filter((r) => r >= 3).length;
                    const result = n === 1 ? (knew ? 'and knew it' : 'and will see it again soon') : `and knew ${knew} of them by the end`;
                    return `You reviewed ${n} ${n === 1 ? 'card' : 'cards'} ${result}. Each card comes back just before you are likely to forget it.`;
                  })()}
            </ThemedText>
          </View>
          <Button label="Back to Today" onPress={close} />
        </View>
      </Screen>
    );
  }

  const left = queue.length;
  const progress = startSize ? Math.min(1, done / Math.max(startSize, done + left)) : 0;
  const isGap = card.front.prompt.includes('___');
  const isFix = card.skill === 'writing' && !isGap;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <View style={styles.barInner}>
          <Pressable accessibilityRole="button" accessibilityLabel="Stop reviewing" hitSlop={10} onPress={close} style={styles.close}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.barText}>
              <ThemedText type="smallBold">Review cards</ThemedText>
              <ThemedText type="caption">{`${left} left`}</ThemedText>
            </View>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View style={{ width: `${Math.max(3, progress * 100)}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
            </View>
          </View>
        </View>
      </View>

      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Pill label={skillName(card.skill)} icon={card.skill in SECTION_INFO ? SECTION_INFO[card.skill as Section].icon : 'layers-outline'} />
          {card.isNew && <Pill label="New" icon="sparkles-outline" />}
        </View>

        {card.front.lines && <ListeningPlayer key={card.id} lines={card.front.lines} maxPlays={3} />}

        <View style={{ gap: Spacing.two }}>
          {card.front.instruction && <ThemedText type="caption">{card.front.instruction}</ThemedText>}
          {isGap ? (
            <GapSentence prompt={card.front.prompt} filled={revealed ? card.back.answer : null} filledColor={theme.good} />
          ) : (
            <ThemedText type="subtitle">{isFix ? `“${card.front.prompt}”` : card.front.prompt}</ThemedText>
          )}
        </View>

        {card.front.passage && (
          <Card>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showText }} onPress={() => setShowText((v) => !v)} style={styles.passageHead}>
              <ThemedText type="heading" style={{ flex: 1 }}>
                {card.front.passage.title}
              </ThemedText>
              <ThemedText type="link">{showText ? 'Hide text' : 'Show text'}</ThemedText>
            </Pressable>
            {showText &&
              card.front.passage.text.split(/\n\n+/).map((para, i) => (
                <ThemedText key={i} type="small" style={{ lineHeight: 22 }}>
                  {para}
                </ThemedText>
              ))}
          </Card>
        )}

        {!revealed ? (
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="caption" style={{ textAlign: 'center' }}>
              Say or think your answer first, then check.
            </ThemedText>
            <Button label="Show answer" onPress={() => setRevealed(true)} />
          </View>
        ) : (
          <>
            <Card>
              <ThemedText type="eyebrow">Answer</ThemedText>
              <ThemedText type="subtitle" style={{ color: theme.good }}>
                {card.back.answer}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{card.back.explanation}</ThemedText>
              {card.back.yourAnswer && <ThemedText type="small" style={{ color: theme.bad }}>{`In your test you chose: ${card.back.yourAnswer}`}</ThemedText>}
              {card.back.transcript && (
                <View style={[styles.transcript, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="caption">What was said</ThemedText>
                  <ThemedText type="small">{card.back.transcript.replace(/^[AB]: /gm, '')}</ThemedText>
                </View>
              )}
            </Card>
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="caption" style={{ textAlign: 'center' }}>
                How well did you know it?
              </ThemedText>
              <View style={styles.ratings}>
                {RATINGS.map((r) => {
                  const primary = r.rating === 3;
                  const bg = primary ? theme.accent : theme.backgroundSelected;
                  const fg = primary ? theme.accentText : r.rating === 1 ? theme.bad : theme.text;
                  return (
                    <Pressable
                      key={r.rating}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.label}, next review in ${card.intervals[r.key]}`}
                      disabled={busy}
                      onPress={() => rate(r.rating)}
                      style={({ pressed }) => [styles.rating, { backgroundColor: bg }, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}>
                      <ThemedText style={{ fontWeight: SEMIBOLD, color: fg }}>{r.label}</ThemedText>
                      <ThemedText type="caption" style={{ color: fg, opacity: 0.75 }}>
                        {card.intervals[r.key]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three + 4, paddingVertical: Spacing.three - 4 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  barText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  passageHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  transcript: { borderRadius: Radius.sm, padding: Spacing.two + 2, gap: 2 },
  ratings: { flexDirection: 'row', gap: Spacing.two },
  rating: { flex: 1, minHeight: 60, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  doneIcon: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
});
