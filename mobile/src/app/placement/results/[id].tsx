import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ListRow, Notice, Pill, Screen, Section } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { LEVELS, placementApi, SECTION_INFO, type Mistake, type Results, type Section as Part } from '@/lib/placement';
import { useSession } from '@/lib/session';

const PARTS: Part[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'];
const METHOD_NOTE = { staircase: null, ai: 'AI graded', estimate: 'Estimate' } as const;

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    placementApi
      .results(token, id)
      .then((r) => setResults(r.results))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Your results could not be loaded. Try again.'));
  }, [token, id]);

  if (!results) {
    return (
      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        {error ? <Notice tone="error">{error}</Notice> : <ActivityIndicator style={{ marginTop: Spacing.six }} />}
      </Screen>
    );
  }

  const r = results;
  return (
    <Screen tabs={false} edges={['left', 'right', 'bottom']}>
      <OverallCard results={r} />

      <Section title="Your skills" footer="Each skill is placed separately. Your plan gives the most time to the lowest two.">
        {PARTS.map((p, i) => (
          <SkillRow key={p} part={p} results={r} last={i === PARTS.length - 1} />
        ))}
      </Section>

      <Card>
        <ThemedText type="eyebrow">Your plan will focus on</ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {r.weakest.map((p) => (
            <Pill key={p} label={`${SECTION_INFO[p].name} · ${r.skills[p].label}`} icon={SECTION_INFO[p].icon} />
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Your personal 12-week plan arrives in the next update and will be built from these results.
        </ThemedText>
      </Card>

      <Section title="Exam equivalents" footer="Indicative only, from published alignments by IELTS, ETS and Cambridge. A real exam gives an official score.">
        <ListRow title="IELTS" trailing={<Value text={r.equivalents.ielts} />} />
        <ListRow title="TOEFL iBT" trailing={<Value text={r.equivalents.toeflIbt} />} />
        <ListRow title="TOEFL band (2026 scale)" trailing={<Value text={r.equivalents.toeflBand} />} />
        <ListRow title="Cambridge exam" trailing={<Value text={r.equivalents.cambridge} />} />
        <ListRow title="Cambridge English Scale" trailing={<Value text={r.equivalents.cambridgeScale} />} last />
      </Section>

      {r.notes.length > 0 && (
        <Notice>
          {r.notes.map((n) => (
            <ThemedText key={n} type="small">
              {n}
            </ThemedText>
          ))}
        </Notice>
      )}

      <WritingFeedback results={r} />
      <SpeakingFeedback results={r} />
      <Mistakes mistakes={r.mistakes} />

      <View style={{ gap: Spacing.two }}>
        <Button label="Back to Today" onPress={() => router.dismissTo('/')} />
        <ThemedText type="caption" style={{ textAlign: 'center' }}>{`Completed in about ${r.minutes} minutes`}</ThemedText>
      </View>
    </Screen>
  );
}

function Value({ text }: { text: string }) {
  return (
    <ThemedText type="heading" style={{ fontVariant: ['tabular-nums'] }}>
      {text}
    </ThemedText>
  );
}

/** The overall level, its description, and a marker on the CEFR scale. */
function OverallCard({ results }: { results: Results }) {
  const theme = useTheme();
  const pos = Math.min(1, Math.max(0, results.overall.score / 6));
  return (
    <View style={{ gap: Spacing.three, paddingTop: Spacing.three }}>
      <ThemedText type="eyebrow">Your English level</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three }}>
        <ThemedText style={styles.big} accessibilityRole="header">
          {results.overall.label}
        </ThemedText>
        <ThemedText type="caption" style={{ marginBottom: 12 }}>
          CEFR
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">{results.summary}</ThemedText>
      <View accessible accessibilityLabel={`Your level ${results.overall.label} on the scale from Pre-A1 to C2`} style={{ gap: 6, marginTop: Spacing.two }}>
        <View style={[styles.scale, { backgroundColor: theme.backgroundSelected }]}>
          <View style={{ width: `${pos * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: Radius.pill }} />
        </View>
        <View style={styles.scaleLabels}>
          {LEVELS.map((l, i) => (
            <ThemedText key={l} type="caption" style={{ fontWeight: Math.floor(results.overall.score) === i ? SEMIBOLD : 400, color: Math.floor(results.overall.score) === i ? theme.text : theme.textTertiary }}>
              {l === 'Pre-A1' ? 'Pre' : l}
            </ThemedText>
          ))}
        </View>
      </View>
    </View>
  );
}

function SkillRow({ part, results, last }: { part: Part; results: Results; last: boolean }) {
  const theme = useTheme();
  const s = results.skills[part];
  const note = METHOD_NOTE[s.method];
  return (
    <View style={[styles.skill, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
      <View style={[styles.iconTile, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={SECTION_INFO[part].icon} size={18} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <ThemedText type="heading">
            {SECTION_INFO[part].name}
            {note ? <ThemedText type="caption">{`  ${note}`}</ThemedText> : null}
          </ThemedText>
          <ThemedText type="heading">{s.label}</ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View style={{ width: `${Math.max(2, (s.score / 6) * 100)}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: s.method === 'estimate' ? theme.textTertiary : theme.accent }} />
        </View>
      </View>
    </View>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 4 }}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {items.map((t) => (
        <ThemedText key={t} type="small" themeColor="textSecondary">{`•  ${t}`}</ThemedText>
      ))}
    </View>
  );
}

function WritingFeedback({ results }: { results: Results }) {
  const theme = useTheme();
  const w = results.writing;
  if (!w.text) return null;
  return (
    <Card>
      <View style={styles.cardHead}>
        <ThemedText type="eyebrow">Writing feedback</ThemedText>
        <Pill label={results.skills.writing.label} />
      </View>
      {w.feedback ? (
        <>
          <ThemedText>{w.feedback.summary}</ThemedText>
          <Bullets title="What went well" items={w.feedback.strengths} />
          <Bullets title="What to work on" items={w.feedback.improvements} />
          {w.feedback.corrections.length > 0 && (
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="smallBold">Corrections</ThemedText>
              {w.feedback.corrections.map((c) => (
                <View key={c.original} style={[styles.correction, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" style={{ color: theme.bad, textDecorationLine: 'line-through' }}>
                    {c.original}
                  </ThemedText>
                  <ThemedText type="smallBold" style={{ color: theme.good }}>
                    {c.corrected}
                  </ThemedText>
                  <ThemedText type="caption">{c.note}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Detailed feedback appears once AI grading is set up on the server.
        </ThemedText>
      )}
    </Card>
  );
}

function SpeakingFeedback({ results }: { results: Results }) {
  const sp = results.speaking;
  const spoken = sp.answers.filter((a) => a.transcript);
  if (!sp.feedback && !spoken.length) return null;
  return (
    <Card>
      <View style={styles.cardHead}>
        <ThemedText type="eyebrow">Speaking feedback</ThemedText>
        <Pill label={results.skills.speaking.label} />
      </View>
      {sp.feedback && (
        <>
          <ThemedText>{sp.feedback.summary}</ThemedText>
          <Bullets title="What went well" items={sp.feedback.strengths} />
          <Bullets title="What to work on" items={sp.feedback.improvements} />
        </>
      )}
      {spoken.map((a, i) => (
        <View key={i} style={{ gap: 4 }}>
          <ThemedText type="smallBold">{a.prompt}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{`“${a.transcript}”`}</ThemedText>
          {a.scores?.pronunciation != null && (
            <ThemedText type="caption">{`Pronunciation ${Math.round(a.scores.pronunciation)} · Fluency ${Math.round(a.scores.fluency ?? 0)} · Rhythm ${Math.round(a.scores.prosody ?? 0)}`}</ThemedText>
          )}
        </View>
      ))}
    </Card>
  );
}

function Mistakes({ mistakes }: { mistakes: Mistake[] }) {
  const theme = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  if (!mistakes.length) return <Notice tone="success">You answered every multiple-choice question correctly.</Notice>;
  return (
    <Section title={`Review your mistakes · ${mistakes.length}`} footer="These become review cards in your daily plan, so they come back until you know them.">
      {mistakes.map((m, i) => {
        const isOpen = open === m.itemId;
        return (
          <Pressable
            key={m.itemId}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
            onPress={() => setOpen(isOpen ? null : m.itemId)}
            style={[styles.mistake, i < mistakes.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="eyebrow">{SECTION_INFO[m.section].name + (m.passageTitle ? ` · ${m.passageTitle}` : '')}</ThemedText>
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="textTertiary" />
            </View>
            <ThemedText type="heading" style={{ lineHeight: 24 }}>
              {m.prompt.replace('___', '_____')}
            </ThemedText>
            <View style={{ gap: 2 }}>
              <ThemedText type="small" style={{ color: theme.bad }}>{`Your answer: ${m.chosen}`}</ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.good }}>{`Correct: ${m.correct}`}</ThemedText>
            </View>
            {isOpen && (
              <View style={{ gap: Spacing.two }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {m.explanation}
                </ThemedText>
                {m.transcript && (
                  <View style={[styles.correction, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="caption">What was said</ThemedText>
                    <ThemedText type="small">{m.transcript.replace(/^[AB]: /gm, '')}</ThemedText>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 64, lineHeight: 70, fontWeight: 700, letterSpacing: -2 },
  scale: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  skill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2 },
  iconTile: { width: 36, height: 36, borderRadius: Radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  correction: { borderRadius: Radius.sm, padding: Spacing.two + 2, gap: 2 },
  mistake: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2, gap: Spacing.two },
});
