import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { loadVoices } from '@/components/placement/listening-player';
import { GapSentence } from '@/components/placement/steps';
import { ThemedText } from '@/components/themed-text';
import { Button, Icon, Notice } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LessonResult, Mcq } from '@/lib/lessons';

/** Says one sentence or word with the app's main voice. */
export function SpeakButton({ text, label = 'Listen', compact }: { text: string; label?: string; compact?: boolean }) {
  const theme = useTheme();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => void Speech.stop(), []);
  async function speak() {
    const voices = await loadVoices();
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, { ...voices.A, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      onPress={speak}
      hitSlop={6}
      style={({ pressed }) => [compact ? styles.speakCompact : styles.speak, { backgroundColor: theme.backgroundSelected }, pressed && { opacity: 0.7 }]}>
      <Ionicons name={speaking ? 'volume-high' : 'volume-medium-outline'} size={18} color={theme.text} />
      {!compact && <ThemedText type="smallBold">{label}</ThemedText>}
    </Pressable>
  );
}

/** "Step 2 of 3" header for multi-part lessons. */
export function StepHeader({ step, steps, title }: { step: number; steps: number; title: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: steps }).map((_, i) => (
          <View key={i} style={[styles.stepBar, { backgroundColor: i <= step ? theme.accent : theme.backgroundSelected }]} />
        ))}
      </View>
      <ThemedText type="eyebrow">{`Step ${step + 1} of ${steps} · ${title}`}</ThemedText>
    </View>
  );
}

/**
 * Practice questions one at a time with feedback straight away (practice testing with feedback).
 * Calls `onDone` with the chosen option index for every question.
 */
export function McqPractice({ questions, onDone, header, busy }: { questions: Mcq[]; onDone: (answers: number[]) => void; header?: (index: number) => React.ReactNode; busy?: boolean }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const q = questions[index];
  const isGap = q.prompt.includes('___');
  const last = index === questions.length - 1;

  function next() {
    const all = [...answers, selected!];
    if (last) {
      onDone(all);
      return;
    }
    setAnswers(all);
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  }

  const right = checked && selected === q.answer;
  return (
    <View style={{ gap: Spacing.four }}>
      {header?.(index)}
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">{`Question ${index + 1} of ${questions.length}`}</ThemedText>
        {isGap ? (
          <GapSentence
            prompt={q.prompt}
            filled={selected === null ? null : q.options[checked ? q.answer : selected]}
            filledColor={checked ? theme.good : undefined}
            reserve={q.options.reduce((a, b) => (b.length > a.length ? b : a), '')}
          />
        ) : (
          <ThemedText type="subtitle">{q.prompt}</ThemedText>
        )}
      </View>
      <View style={{ gap: Spacing.two }} accessibilityRole="radiogroup">
        {q.options.map((opt, i) => {
          const isAnswer = checked && i === q.answer;
          const isWrongPick = checked && i === selected && i !== q.answer;
          const on = selected === i;
          const border = isAnswer ? theme.good : isWrongPick ? theme.bad : on ? theme.accent : theme.border;
          const bg = isAnswer ? theme.goodSoft : isWrongPick ? theme.badSoft : theme.backgroundElement;
          return (
            <Pressable
              key={`${index}-${i}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: checked }}
              accessibilityLabel={opt}
              disabled={checked}
              onPress={() => setSelected(i)}
              style={({ pressed }) => [styles.option, { backgroundColor: bg, borderColor: border, borderWidth: on || isAnswer ? 2 : 1 }, pressed && { opacity: 0.85 }]}>
              <View style={[styles.letter, { backgroundColor: isAnswer ? theme.good : isWrongPick ? theme.bad : on ? theme.accent : theme.backgroundSelected }]}>
                {isAnswer ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : isWrongPick ? (
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                ) : (
                  <ThemedText style={{ fontWeight: 700, fontSize: 14, color: on ? theme.accentText : theme.textSecondary }}>{String.fromCharCode(65 + i)}</ThemedText>
                )}
              </View>
              <ThemedText style={{ flex: 1 }}>{opt}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      {checked && (
        <Notice tone={right ? 'success' : 'error'}>
          <ThemedText type="smallBold" style={{ color: right ? theme.good : theme.bad }}>
            {right ? 'Correct' : `The answer is: ${q.options[q.answer]}`}
          </ThemedText>
          <ThemedText type="small">{q.explanation}</ThemedText>
        </Notice>
      )}
      {!checked ? (
        <Button label="Check" onPress={() => setChecked(true)} disabled={selected === null} />
      ) : (
        <Button label={last ? 'Finish' : 'Next'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={next} loading={busy && last} />
      )}
    </View>
  );
}

const REC: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };

/** Recording with a timer and automatic stop. `toForm` turns the recording into an upload. */
export function useRecorder(maxSeconds: number) {
  const recorder = useAudioRecorder(REC);
  const state = useAudioRecorderState(recorder, 200);
  const [uri, setUri] = useState<string | null>(null);
  const [length, setLength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recording = state.isRecording;
  const live = Math.floor((state.durationMillis || 0) / 1000);

  async function start() {
    setError(null);
    setUri(null);
    Speech.stop();
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('The app needs microphone access. Allow it in your phone settings, then try again.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError('Recording could not start. Close other apps that use the microphone and try again.');
    }
  }
  async function stop() {
    try {
      setLength(live);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setUri(recorder.uri);
    } catch {
      setError('Recording could not be saved. Try again.');
    }
  }
  useEffect(() => {
    if (!(recording && live >= maxSeconds)) return;
    // Stop on the next tick, so the state update happens outside the effect.
    const t = setTimeout(() => stop(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, recording]);

  async function append(form: FormData, field = 'audio') {
    if (!uri) return;
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append(field, blob, `answer.${blob.type.includes('webm') ? 'webm' : 'm4a'}`);
    } else {
      // Expo's fetch needs a real Blob; expo-file-system's File is one, backed by the recording on disk.
      form.append(field, new File(uri), 'answer.m4a');
    }
  }
  return { recording, seconds: recording ? live : length, uri, error, start, stop, append, reset: () => setUri(null) };
}

/** The big round record button with a timer underneath. */
export function RecordButton({ rec, maxSeconds, disabled, size = 'large' }: { rec: ReturnType<typeof useRecorder>; maxSeconds: number; disabled?: boolean; size?: 'large' | 'small' }) {
  const theme = useTheme();
  const big = size === 'large';
  return (
    <View style={{ alignItems: 'center', gap: Spacing.two }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rec.recording ? 'Stop recording' : 'Start recording'}
        disabled={disabled}
        onPress={rec.recording ? rec.stop : rec.start}
        style={({ pressed }) => [big ? styles.ring : styles.ringSmall, { borderColor: rec.recording ? theme.bad : theme.border }, pressed && { transform: [{ scale: 0.96 }] }, disabled && { opacity: 0.5 }]}>
        <View style={[big ? styles.rec : styles.recSmall, { backgroundColor: rec.recording ? theme.bad : theme.accent }]}>
          <Ionicons name={rec.recording ? 'stop' : 'mic'} size={big ? 34 : 26} color={rec.recording ? '#FFFFFF' : theme.accentText} />
        </View>
      </Pressable>
      <ThemedText type={big ? 'number' : 'heading'} style={{ color: rec.recording ? theme.bad : theme.text }}>{`0:${String(rec.seconds).padStart(2, '0')}`}</ThemedText>
      <ThemedText type="caption">{rec.recording ? `Recording · stops at 0:${maxSeconds}` : rec.uri ? 'Tap to record again' : 'Tap to start recording'}</ThemedText>
      {rec.error && <Notice tone="error">{rec.error}</Notice>}
    </View>
  );
}

/** Pronunciation words coloured by score. */
export function WordScores({ words }: { words: { word: string; accuracy: number | null; errorType: string }[] }) {
  const theme = useTheme();
  return (
    <View style={styles.words}>
      {words.map((w, i) => {
        const weak = w.errorType !== 'None' || (w.accuracy ?? 100) < 60;
        return (
          <View key={`${w.word}-${i}`} style={[styles.word, { backgroundColor: weak ? theme.badSoft : theme.goodSoft }]}>
            <ThemedText type="smallBold" style={{ color: weak ? theme.bad : theme.good }}>
              {w.word}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/** The end of a lesson: what was achieved, what was added for review, and the way back. */
export function LessonDone({ result, children }: { result: LessonResult; children?: React.ReactNode }) {
  const theme = useTheme();
  const pct = result.total ? Math.round(((result.correct ?? 0) / result.total) * 100) : null;
  const minutes = Math.max(1, Math.round(result.seconds / 60));
  return (
    <View style={{ gap: Spacing.four }}>
      <View style={{ gap: Spacing.three, paddingTop: Spacing.two }}>
        <View style={[styles.doneIcon, { backgroundColor: theme.accent }]}>
          <Ionicons name="checkmark" size={30} color={theme.accentText} />
        </View>
        <ThemedText type="title" accessibilityRole="header">
          Lesson complete
        </ThemedText>
        <View style={styles.stats}>
          {pct !== null && <Stat label="Correct" value={`${result.correct}/${result.total}`} />}
          <Stat label="Minutes" value={String(minutes)} />
          <Stat label="New cards" value={String(result.cardsAdded)} />
        </View>
        {result.cardsAdded > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {`${result.cardsAdded} ${result.cardsAdded === 1 ? 'item was' : 'items were'} added to your review cards, so they come back until you know them.`}
          </ThemedText>
        )}
      </View>
      {children}
      <Button label="Back to Today" onPress={() => router.dismissTo('/')} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="caption">{label}</ThemedText>
    </View>
  );
}

export function Bullets({ title, items, icon }: { title: string; items: string[]; icon?: 'checkmark-circle-outline' | 'arrow-up-circle-outline' }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Icon name={icon ?? 'ellipse-outline'} size={16} color="textSecondary" />
          <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
            {t}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export function Corrections({ list }: { list: { original: string; corrected: string; note: string }[] }) {
  const theme = useTheme();
  if (!list.length) return null;
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">Corrections</ThemedText>
      {list.map((c) => (
        <View key={c.original} style={[styles.fix, { backgroundColor: theme.backgroundSelected }]}>
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
  );
}

export function ScoreRow({ label, value }: { label: string; value: number | null }) {
  const theme = useTheme();
  if (value === null) return null;
  return (
    <View style={styles.scoreRow}>
      <ThemedText type="small" style={{ width: 112 }}>
        {label}
      </ThemedText>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={{ width: `${Math.max(2, Math.min(100, value))}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
      </View>
      <ThemedText type="smallBold" style={{ width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
        {Math.round(value)}
      </ThemedText>
    </View>
  );
}


const styles = StyleSheet.create({
  speak: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  speakCompact: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepBar: { flex: 1, height: 4, borderRadius: Radius.pill },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4, minHeight: 56, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, borderRadius: Radius.md },
  letter: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 112, height: 112, borderRadius: 56, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  ringSmall: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  rec: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  recSmall: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  word: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  doneIcon: { width: 60, height: 60, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: 2 },
  fix: { borderRadius: Radius.sm, padding: Spacing.two + 2, gap: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
});

