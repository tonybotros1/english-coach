import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ListeningPlayer } from '@/components/placement/listening-player';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, Pill } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { lessonApi, type Lesson, type LessonContent, type ShadowResult } from '@/lib/lessons';
import { Bullets, Corrections, LessonDone, McqPractice, RecordButton, ScoreRow, SpeakButton, StepHeader, WordScores, useRecorder } from './shared';

type Props<K extends LessonContent['kind']> = { lesson: Lesson & { content: Extract<LessonContent, { kind: K }> }; token: string; onFinished: (l: Lesson) => void };

/** Seconds since the lesson opened, sent with the result to count study time. */
function useElapsed() {
  const started = useRef<number | null>(null);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  return () => (started.current ? Math.round((Date.now() - started.current) / 1000) : 0);
}
const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Your answers could not be saved. Check your connection and try again.');

function useSubmit<T>(fn: () => Promise<T>, onDone: (t: T) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    busy,
    error,
    run: async () => {
      setBusy(true);
      setError(null);
      try {
        onDone(await fn());
      } catch (e) {
        setError(message(e));
      } finally {
        setBusy(false);
      }
    },
  };
}

// ---------- Grammar ----------
export function GrammarLesson({ lesson, token, onFinished }: Props<'grammar'>) {
  const c = lesson.content;
  const elapsed = useElapsed();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function finish(answers: number[]) {
    setBusy(true);
    setError(null);
    try {
      onFinished((await lessonApi.complete(token, lesson.id, answers, elapsed())).lesson);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  if (step === 0)
    return (
      <View style={{ gap: Spacing.four }}>
        <StepHeader step={0} steps={2} title="Learn" />
        <ThemedText type="title">{c.title}</ThemedText>
        <Card>
          {c.explanation.map((p, i) => (
            <ThemedText key={i} style={{ lineHeight: 25 }}>
              {p}
            </ThemedText>
          ))}
        </Card>
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="eyebrow">Examples</ThemedText>
          {c.examples.map((e) => (
            <Card key={e.sentence}>
              <ThemedText type="heading" style={{ lineHeight: 24 }}>
                {e.sentence}
              </ThemedText>
              <ThemedText type="caption">{e.note}</ThemedText>
            </Card>
          ))}
        </View>
        <Button label="Start practice" icon="arrow-forward" onPress={() => setStep(1)} />
      </View>
    );
  return (
    <View style={{ gap: Spacing.four }}>
      <StepHeader step={1} steps={2} title="Practise" />
      <McqPractice questions={c.practice} onDone={finish} busy={busy} />
      {error && <Notice tone="error">{error}</Notice>}
    </View>
  );
}

// ---------- Vocabulary ----------
export function VocabularyLesson({ lesson, token, onFinished }: Props<'vocabulary'>) {
  const theme = useTheme();
  const c = lesson.content;
  const elapsed = useElapsed();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function finish(answers: number[]) {
    setBusy(true);
    setError(null);
    try {
      onFinished((await lessonApi.complete(token, lesson.id, answers, elapsed())).lesson);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  if (step === 0)
    return (
      <View style={{ gap: Spacing.four }}>
        <StepHeader step={0} steps={2} title="New words" />
        <ThemedText type="title">{c.title}</ThemedText>
        <ThemedText themeColor="textSecondary">Read each word, listen to it, and say the example aloud. All of them become review cards.</ThemedText>
        {c.words.map((w) => (
          <Card key={w.word}>
            <View style={styles.wordHead}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="subtitle">{w.word}</ThemedText>
                <ThemedText type="caption">{w.partOfSpeech}</ThemedText>
              </View>
              <SpeakButton text={w.word} compact />
            </View>
            <ThemedText>{w.meaning}</ThemedText>
            <View style={[styles.example, { borderLeftColor: theme.accent }]}>
              <ThemedText type="small" style={{ fontStyle: 'italic' }}>
                {w.example}
              </ThemedText>
            </View>
            <Pill label={w.collocation} icon="link-outline" />
          </Card>
        ))}
        <Button label="Start practice" icon="arrow-forward" onPress={() => setStep(1)} />
      </View>
    );
  return (
    <View style={{ gap: Spacing.four }}>
      <StepHeader step={1} steps={2} title="Practise" />
      <McqPractice questions={c.practice} onDone={finish} busy={busy} />
      {error && <Notice tone="error">{error}</Notice>}
    </View>
  );
}

// ---------- Reading ----------
function Passage({ title, text, glossary }: { title: string; text: string; glossary: { word: string; meaning: string }[] }) {
  return (
    <Card>
      <ThemedText type="subtitle">{title}</ThemedText>
      {text.split(/\n\n+/).map((p, i) => (
        <ThemedText key={i} style={{ lineHeight: 26 }}>
          {p}
        </ThemedText>
      ))}
      {glossary.length > 0 && (
        <View style={{ gap: 4, marginTop: Spacing.one }}>
          <ThemedText type="eyebrow">Glossary</ThemedText>
          {glossary.map((g) => (
            <ThemedText key={g.word} type="small">
              <ThemedText type="smallBold">{g.word}</ThemedText>
              {`  ${g.meaning}`}
            </ThemedText>
          ))}
        </View>
      )}
    </Card>
  );
}

export function ReadingLesson({ lesson, token, onFinished }: Props<'reading'>) {
  const c = lesson.content;
  const elapsed = useElapsed();
  const [step, setStep] = useState(0);
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function finish(answers: number[]) {
    setBusy(true);
    setError(null);
    try {
      onFinished((await lessonApi.complete(token, lesson.id, answers, elapsed())).lesson);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  if (step === 0)
    return (
      <View style={{ gap: Spacing.four }}>
        <StepHeader step={0} steps={2} title="Read" />
        <ThemedText themeColor="textSecondary">Read the whole text once for the main idea. Use the glossary for new words.</ThemedText>
        <Passage title={c.title} text={c.text} glossary={c.glossary} />
        <Button label="Answer the questions" icon="arrow-forward" onPress={() => setStep(1)} />
      </View>
    );
  return (
    <View style={{ gap: Spacing.four }}>
      <StepHeader step={1} steps={2} title="Questions" />
      <McqPractice
        questions={c.questions}
        onDone={finish}
        busy={busy}
        header={() => (
          <View style={{ gap: Spacing.two }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showText }} onPress={() => setShowText((v) => !v)}>
              <ThemedText type="link">{showText ? 'Hide the text' : 'Look at the text again'}</ThemedText>
            </Pressable>
            {showText && <Passage title={c.title} text={c.text} glossary={[]} />}
          </View>
        )}
      />
      {error && <Notice tone="error">{error}</Notice>}
    </View>
  );
}

// ---------- Listening ----------
export function ListeningLesson({ lesson, token, onFinished }: Props<'listening'>) {
  const theme = useTheme();
  const c = lesson.content;
  const elapsed = useElapsed();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[] | null>(null);
  const [typed, setTyped] = useState<string[]>(c.dictation.map(() => ''));
  const submit = useSubmit(
    () => lessonApi.complete(token, lesson.id, answers!, elapsed(), typed),
    (r) => onFinished(r.lesson),
  );
  if (step === 0)
    return (
      <View style={{ gap: Spacing.four }}>
        <StepHeader step={0} steps={2} title="Listen and answer" />
        <ThemedText type="subtitle">{c.setting}</ThemedText>
        <ListeningPlayer lines={c.lines} maxPlays={3} />
        <McqPractice
          questions={c.questions}
          onDone={(a) => {
            setAnswers(a);
            setStep(1);
          }}
        />
      </View>
    );
  return (
    <View style={{ gap: Spacing.four }}>
      <StepHeader step={1} steps={2} title="Dictation" />
      <ThemedText themeColor="textSecondary">Listen to each sentence and type exactly what you hear. Play it as often as you need.</ThemedText>
      {c.dictation.map((s, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText type="heading">{`Sentence ${i + 1}`}</ThemedText>
            <SpeakButton text={s} label="Play" />
          </View>
          <TextInput
            accessibilityLabel={`Sentence ${i + 1}`}
            value={typed[i]}
            onChangeText={(t) => setTyped((list) => list.map((x, j) => (j === i ? t : x)))}
            placeholder="Type what you hear…"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="sentences"
            autoCorrect={false}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          />
        </Card>
      ))}
      {submit.error && <Notice tone="error">{submit.error}</Notice>}
      <Button label="Check my dictation" icon="checkmark" onPress={submit.run} loading={submit.busy} disabled={typed.some((t) => !t.trim())} />
    </View>
  );
}

// ---------- Writing ----------
export function WritingLesson({ lesson, token, onFinished }: Props<'writing'>) {
  const theme = useTheme();
  const c = lesson.content;
  const elapsed = useElapsed();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  const submit = useSubmit(
    () => lessonApi.writing(token, lesson.id, text, elapsed()),
    (r) => onFinished(r.lesson),
  );
  return (
    <View style={{ gap: Spacing.four }}>
      <ThemedText type="title">{c.title}</ThemedText>
      <Card>
        <ThemedText type="heading" style={{ lineHeight: 24 }}>
          {c.task}
        </ThemedText>
        <Bullets title="Include" items={c.guidance} icon="checkmark-circle-outline" />
      </Card>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">Useful language</ThemedText>
        <View style={styles.chips}>
          {c.usefulLanguage.map((p) => (
            <Pill key={p} label={p} />
          ))}
        </View>
      </View>
      <TextInput
        accessibilityLabel="Your writing"
        value={text}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        textAlignVertical="top"
        placeholder="Start writing here…"
        placeholderTextColor={theme.textTertiary}
        editable={!submit.busy}
        style={[styles.writing, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: focused ? theme.accent : theme.border }]}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText type="smallBold" style={{ color: count >= c.minWords && count <= c.maxWords ? theme.good : theme.text }}>{`${count} words`}</ThemedText>
        <ThemedText type="caption">{`Aim for ${c.minWords} to ${c.maxWords}`}</ThemedText>
      </View>
      {submit.busy && <Notice>Your writing is being checked. This can take up to 30 seconds.</Notice>}
      {submit.error && <Notice tone="error">{submit.error}</Notice>}
      <Button label="Get feedback" icon="sparkles-outline" onPress={submit.run} loading={submit.busy} disabled={count < 5} />
    </View>
  );
}

// ---------- Speaking ----------
const SHADOW_SECONDS = 15;
const TALK_SECONDS = 30;

export function SpeakingLesson({ lesson, token, onFinished }: Props<'speaking'>) {
  const theme = useTheme();
  const c = lesson.content;
  const elapsed = useElapsed();
  const firstUndone = lesson.shadowing.findIndex((s) => !s);
  const [index, setIndex] = useState(firstUndone === -1 ? c.shadowing.length : firstUndone);
  const [results, setResults] = useState<(ShadowResult | null)[]>(lesson.shadowing.length ? lesson.shadowing : c.shadowing.map(() => null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRecorder(index < c.shadowing.length ? SHADOW_SECONDS : TALK_SECONDS);
  const talking = index >= c.shadowing.length;

  async function scoreShadow() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      await rec.append(form);
      form.append('lessonId', lesson.id);
      form.append('index', String(index));
      const r = await lessonApi.shadow(token, form);
      setResults((list) => list.map((x, i) => (i === index ? r.result : x)));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function submitTalk() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      await rec.append(form);
      form.append('lessonId', lesson.id);
      form.append('lessonSeconds', String(elapsed()));
      onFinished((await lessonApi.talk(token, form)).lesson);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }

  if (!talking) {
    const sentence = c.shadowing[index];
    const r = results[index];
    return (
      <View style={{ gap: Spacing.four }}>
        <StepHeader step={0} steps={2} title={`Shadowing ${index + 1} of ${c.shadowing.length}`} />
        <ThemedText themeColor="textSecondary">Listen, then say the sentence straight away, copying the rhythm and stress.</ThemedText>
        <Card>
          <ThemedText type="subtitle">{sentence}</ThemedText>
          <SpeakButton text={sentence} label="Listen" />
        </Card>
        <RecordButton rec={rec} maxSeconds={SHADOW_SECONDS} disabled={busy} />
        {r && !rec.recording && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText type="eyebrow">Your pronunciation</ThemedText>
              <ThemedText type="subtitle">{Math.round(r.scores.pronunciation ?? 0)}</ThemedText>
            </View>
            <WordScores words={r.words} />
            <ThemedText type="caption">Words in red need more practice.</ThemedText>
          </Card>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {rec.uri && !rec.recording && !r && <Button label="Check my pronunciation" onPress={scoreShadow} loading={busy} />}
        {r && !rec.recording && (
          <Button
            label={index + 1 < c.shadowing.length ? 'Next sentence' : 'Go to free talk'}
            icon="arrow-forward"
            onPress={() => {
              rec.reset();
              setIndex(index + 1);
            }}
          />
        )}
        {!r && !rec.uri && (
          <Pressable onPress={() => setIndex(index + 1)} style={{ alignSelf: 'center', padding: Spacing.two }} accessibilityRole="button">
            <ThemedText type="small" themeColor="textSecondary" style={{ fontWeight: SEMIBOLD }}>
              Skip this sentence
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.four }}>
      <StepHeader step={1} steps={2} title="Free talk" />
      <Card>
        <ThemedText type="subtitle">{c.question}</ThemedText>
        <Bullets title="Tips" items={c.tips} icon="arrow-up-circle-outline" />
      </Card>
      <RecordButton rec={rec} maxSeconds={TALK_SECONDS} disabled={busy} />
      {busy && <Notice>Your answer is being scored. This can take up to 30 seconds.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {rec.uri && !rec.recording && <Button label="Get feedback" icon="sparkles-outline" onPress={submitTalk} loading={busy} />}
      <ThemedText type="caption" style={{ textAlign: 'center', color: theme.textTertiary }}>{`Speak for up to ${TALK_SECONDS} seconds.`}</ThemedText>
    </View>
  );
}

// ---------- Results ----------
export function LessonResults({ lesson }: { lesson: Lesson }) {
  const theme = useTheme();
  const r = lesson.result!;
  return (
    <LessonDone result={r}>
      {r.dictation && (
        <Card>
          <ThemedText type="eyebrow">Dictation</ThemedText>
          {r.dictation.map((d, i) => (
            <View key={i} style={{ gap: 4 }}>
              <ThemedText type="small">
                {d.words.map((w, j) => (
                  <ThemedText key={j} type="small">
                    <ThemedText type="small" style={{ color: w.ok ? theme.text : theme.bad, fontWeight: w.ok ? 400 : SEMIBOLD, textDecorationLine: w.ok ? 'none' : 'underline' }}>
                      {w.word}
                    </ThemedText>
                    {j < d.words.length - 1 ? ' ' : ''}
                  </ThemedText>
                ))}
              </ThemedText>
              <ThemedText type="caption">{`${d.accuracy}% · you typed: ${d.typed || '(nothing)'}`}</ThemedText>
            </View>
          ))}
          <ThemedText type="caption">Underlined words were missed.</ThemedText>
        </Card>
      )}
      {r.writing && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText type="eyebrow">Feedback</ThemedText>
            <Pill label={r.writing.feedback.label} />
          </View>
          <ThemedText>{r.writing.feedback.summary}</ThemedText>
          <Bullets title="What went well" items={r.writing.feedback.strengths} icon="checkmark-circle-outline" />
          <Bullets title="What to work on" items={r.writing.feedback.improvements} icon="arrow-up-circle-outline" />
          <Corrections list={r.writing.feedback.corrections} />
          <View style={[styles.improved, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">A stronger version</ThemedText>
            <ThemedText type="small" style={{ lineHeight: 22 }}>
              {r.writing.feedback.improved}
            </ThemedText>
          </View>
        </Card>
      )}
      {r.speaking && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText type="eyebrow">Speaking feedback</ThemedText>
            {r.speaking.label && <Pill label={r.speaking.label} />}
          </View>
          {r.speaking.feedback && <ThemedText>{r.speaking.feedback.summary}</ThemedText>}
          {r.speaking.scores && (
            <View style={{ gap: Spacing.two }}>
              <ScoreRow label="Pronunciation" value={r.speaking.scores.pronunciation} />
              <ScoreRow label="Fluency" value={r.speaking.scores.fluency} />
              <ScoreRow label="Rhythm" value={r.speaking.scores.prosody} />
            </View>
          )}
          {r.speaking.feedback && (
            <>
              <Bullets title="What went well" items={r.speaking.feedback.strengths} icon="checkmark-circle-outline" />
              <Bullets title="What to work on" items={r.speaking.feedback.improvements} icon="arrow-up-circle-outline" />
            </>
          )}
          <ThemedText type="small" themeColor="textSecondary">{`“${r.speaking.transcript}”`}</ThemedText>
        </Card>
      )}
    </LessonDone>
  );
}

const styles = StyleSheet.create({
  wordHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  example: { borderLeftWidth: 3, paddingLeft: Spacing.two + 2, paddingVertical: 2 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three - 4, fontSize: 16, minHeight: 56 },
  writing: { minHeight: 220, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.three, fontSize: 16, lineHeight: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  improved: { borderRadius: Radius.sm, padding: Spacing.three - 4, gap: 4 },
});
