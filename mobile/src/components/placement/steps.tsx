import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ListeningPlayer } from '@/components/placement/listening-player';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, Notice } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SECTION_INFO, type PublicItem, type Section } from '@/lib/placement';
import { storage } from '@/lib/storage';

export function SectionIntro({ section, index, count, onStart }: { section: Section; index: number; count: number; onStart: () => void }) {
  const theme = useTheme();
  const info = SECTION_INFO[section];
  return (
    <View style={{ gap: Spacing.four, paddingTop: Spacing.four }}>
      <View style={[styles.introIcon, { backgroundColor: theme.accent }]}>
        <Ionicons name={info.icon} size={30} color={theme.accentText} />
      </View>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">{`Part ${index + 1} of ${count}`}</ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          {info.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{info.help}</ThemedText>
      </View>
      <View style={styles.introMeta}>
        <Icon name="time-outline" size={18} color="textSecondary" />
        <ThemedText type="small" themeColor="textSecondary">{`About ${info.minutes} minutes`}</ThemedText>
      </View>
      <Button label={`Start ${info.name.toLowerCase()}`} onPress={onStart} />
    </View>
  );
}

/**
 * Shows a sentence with its ___ gap, filled in with the chosen option once one is picked. `reserve` (the
 * longest option) keeps the gap the same width whatever is chosen, so the buttons below never jump.
 */
export function GapSentence({ prompt, filled, filledColor, reserve }: { prompt: string; filled: string | null; filledColor?: string; reserve?: string }) {
  const theme = useTheme();
  const [before, after] = prompt.includes('___') ? prompt.split('___') : [prompt, null];
  const width = Math.max(4, reserve?.length ?? 4);
  const pad = (t: string) => t + ' '.repeat(Math.max(0, width - t.length));
  return (
    <ThemedText type="subtitle" style={{ fontWeight: SEMIBOLD, lineHeight: 32 }}>
      {before}
      {after !== null && (
        <ThemedText type="subtitle" style={{ color: filled ? (filledColor ?? theme.text) : theme.textTertiary, textDecorationLine: 'underline', lineHeight: 32 }}>
          {reserve ? pad(filled ?? '') : (filled ?? '    ')}
        </ThemedText>
      )}
      {after}
    </ThemedText>
  );
}

export function McqStep({ item, section, questionNumber, busy, onAnswer }: { item: PublicItem; section: Section; questionNumber: number; busy: boolean; onAnswer: (choice: number) => void }) {
  const theme = useTheme();
  // The parent gives each question its own key, so the selection starts empty for every question.
  const [selected, setSelected] = useState<number | null>(null);
  const isGap = item.prompt.includes('___');

  return (
    <View style={{ gap: Spacing.four }}>
      {item.passage && (
        <Card>
          <ThemedText type="heading">{item.passage.title}</ThemedText>
          {item.passage.text.split(/\n\n+/).map((p, i) => (
            <ThemedText key={i} style={{ lineHeight: 26 }}>
              {p}
            </ThemedText>
          ))}
        </Card>
      )}
      {item.lines && <ListeningPlayer key={item.id} lines={item.lines} />}

      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">{`${SECTION_INFO[section].name} · Question ${questionNumber}`}</ThemedText>
        {isGap ? (
          <GapSentence prompt={item.prompt} filled={selected === null ? null : item.options[selected]} reserve={item.options.reduce((a, b) => (b.length > a.length ? b : a), '')} />
        ) : (
          <ThemedText type="subtitle">{item.prompt}</ThemedText>
        )}
      </View>

      <View style={{ gap: Spacing.two }} accessibilityRole="radiogroup">
        {item.options.map((opt, i) => {
          const on = selected === i;
          return (
            <Pressable
              key={`${item.id}-${i}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: busy }}
              accessibilityLabel={opt}
              disabled={busy}
              onPress={() => setSelected(i)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: theme.backgroundElement, borderColor: on ? theme.accent : theme.border, borderWidth: on ? 2 : 1 },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <View style={[styles.letter, { backgroundColor: on ? theme.accent : theme.backgroundSelected }]}>
                <ThemedText style={{ fontWeight: 700, fontSize: 14, color: on ? theme.accentText : theme.textSecondary }}>{String.fromCharCode(65 + i)}</ThemedText>
              </View>
              <ThemedText style={{ flex: 1 }}>{opt}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Button label="Next" icon="arrow-forward" onPress={() => selected !== null && onAnswer(selected)} disabled={selected === null} loading={busy} />
    </View>
  );
}

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export function WritingStep({
  testId,
  prompt,
  targetWords,
  maxChars,
  busy,
  onSubmit,
}: {
  testId: string;
  prompt: string;
  targetWords: { min: number; max: number };
  maxChars: number;
  busy: boolean;
  onSubmit: (text: string) => void;
}) {
  const theme = useTheme();
  const key = `ec_writing_${testId}`;
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [confirmShort, setConfirmShort] = useState(false);
  const loaded = useRef(false);

  // Keep a draft on the phone so leaving the test never loses what was written.
  useEffect(() => {
    storage.get(key).then((d) => {
      if (d) setText(d);
      loaded.current = true;
    });
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => storage.set(key, text).catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [key, text]);

  const words = countWords(text);
  const inRange = words >= targetWords.min && words <= targetWords.max;
  const submit = () => {
    if (words < 40 && !confirmShort) {
      setConfirmShort(true);
      return;
    }
    onSubmit(text);
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">Your task</ThemedText>
        <ThemedText type="heading" style={{ lineHeight: 24 }}>
          {prompt}
        </ThemedText>
        <ThemedText type="caption">{`Aim for ${targetWords.min} to ${targetWords.max} words. Beginners can write a few simple sentences.`}</ThemedText>
      </View>
      <TextInput
        accessibilityLabel="Your answer"
        value={text}
        onChangeText={(t) => {
          setText(t.slice(0, maxChars));
          setConfirmShort(false);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        textAlignVertical="top"
        placeholder="Start writing here…"
        placeholderTextColor={theme.textTertiary}
        editable={!busy}
        style={[styles.writing, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: focused ? theme.accent : theme.border }]}
      />
      <View style={styles.wordRow}>
        <ThemedText type="smallBold" style={{ color: inRange ? theme.good : theme.text }}>{`${words} ${words === 1 ? 'word' : 'words'}`}</ThemedText>
        <ThemedText type="caption">{words > targetWords.max ? 'A little long, but that is fine' : inRange ? 'Good length' : `${Math.max(0, targetWords.min - words)} to go`}</ThemedText>
      </View>
      {confirmShort && <Notice>{'Your answer is short. That is fine if you are a beginner, but longer answers show more of what you can do. Tap again to submit.'}</Notice>}
      {busy && <Notice>Grading your writing. This can take up to 30 seconds.</Notice>}
      <Button label={confirmShort ? 'Submit anyway' : 'Submit writing'} onPress={submit} loading={busy} disabled={words === 0} />
    </View>
  );
}

// Mono AAC keeps uploads small. The server converts it to the WAV format the speech service needs.
const REC_OPTIONS: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };

export function SpeakingStep({
  taskIndex,
  taskCount,
  prompt,
  maxSeconds,
  busy,
  error,
  onSubmit,
  onSkip,
}: {
  taskIndex: number;
  taskCount: number;
  prompt: string;
  maxSeconds: number;
  busy: boolean;
  error: string | null;
  onSubmit: (form: FormData) => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const recorder = useAudioRecorder(REC_OPTIONS);
  const state = useAudioRecorderState(recorder, 200);
  const player = useAudioPlayer(null);
  const [uri, setUri] = useState<string | null>(null);
  const [length, setLength] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const recording = state.isRecording;
  const live = Math.floor((state.durationMillis || 0) / 1000);
  const seconds = recording ? live : length;

  useEffect(() => {
    if (recording && live >= maxSeconds) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, recording]);

  async function start() {
    setMicError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMicError('The app needs microphone access. Allow it in your phone settings, then try again.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setMicError('Recording could not start. Close other apps that use the microphone and try again.');
    }
  }

  async function stop() {
    try {
      setLength(live);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const u = recorder.uri;
      setUri(u);
      if (u) player.replace({ uri: u });
    } catch {
      setMicError('Recording could not be saved. Try again.');
    }
  }

  async function submit() {
    if (!uri) return;
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'm4a';
      form.append('audio', blob, `answer.${ext}`);
    } else {
      // Expo's fetch needs a real Blob; expo-file-system's File is one, backed by the recording on disk.
      form.append('audio', new File(uri), 'answer.m4a');
    }
    onSubmit(form);
  }

  return (
    <View style={{ gap: Spacing.four }}>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">{`Question ${taskIndex + 1} of ${taskCount}`}</ThemedText>
        <Card>
          <ThemedText type="subtitle">{prompt}</ThemedText>
          <ThemedText type="caption">{`Think for a moment, then speak for up to ${maxSeconds} seconds.`}</ThemedText>
        </Card>
      </View>

      <View style={styles.recorder}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          disabled={busy}
          onPress={recording ? stop : start}
          style={({ pressed }) => [styles.ring, { borderColor: recording ? theme.bad : theme.border }, pressed && { transform: [{ scale: 0.96 }] }]}>
          <View style={[styles.recordButton, { backgroundColor: recording ? theme.bad : theme.accent }]}>
            <Ionicons name={recording ? 'stop' : 'mic'} size={34} color={recording ? '#FFFFFF' : theme.accentText} />
          </View>
        </Pressable>
        <ThemedText type="number" style={{ color: recording ? theme.bad : theme.text }}>{`0:${String(seconds).padStart(2, '0')}`}</ThemedText>
        <ThemedText type="caption">{recording ? `Recording · stops at 0:${maxSeconds}` : uri ? 'Your answer · tap to record again' : 'Tap to start recording'}</ThemedText>
      </View>

      {micError && <Notice tone="error">{micError}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {busy && <Notice>Scoring your answer. This can take up to 30 seconds.</Notice>}

      {uri && !recording && (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button label="Play" icon="play" variant="secondary" disabled={busy} onPress={() => { player.seekTo(0); player.play(); }} />
          </View>
          <View style={{ flex: 1.6 }}>
            <Button label={taskIndex + 1 < taskCount ? 'Submit answer' : 'Submit and finish'} onPress={submit} loading={busy} />
          </View>
        </View>
      )}

      {!recording && !busy && (
        <Pressable
          accessibilityRole="button"
          onPress={() => (confirmSkip ? onSkip() : setConfirmSkip(true))}
          style={styles.skip}
          hitSlop={8}>
          <ThemedText type="small" themeColor={confirmSkip ? 'text' : 'textSecondary'} style={{ fontWeight: SEMIBOLD, textAlign: 'center' }}>
            {confirmSkip ? 'Tap again to skip. Your speaking level will be estimated.' : "I can't speak right now"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  introIcon: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  introMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 4, minHeight: 56, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, borderRadius: Radius.md },
  letter: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  writing: { minHeight: 240, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.three, fontSize: 16, lineHeight: 24 },
  wordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -Spacing.two },
  recorder: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  ring: { width: 112, height: 112, borderRadius: 56, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  recordButton: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  skip: { alignSelf: 'center', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
});
