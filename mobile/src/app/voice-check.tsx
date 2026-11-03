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
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Notice, Pill, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

const SENTENCE = "I've been working on this project since January.";
const MAX_SECONDS = 25;
// Mono AAC keeps uploads small. The server converts it to the WAV format the speech service needs.
const OPTIONS: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };

type Scores = { pronunciation: number | null; accuracy: number | null; fluency: number | null; completeness: number | null; prosody: number | null };
type Result =
  | { dryRun: true; speechConfigured: boolean; converted: { seconds: number; bytes: number } }
  | { dryRun: false; seconds: number; status: string; recognized: string; scores: Scores; words: { word: string; accuracy: number | null; errorType: string }[] };

export default function VoiceCheckScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const recorder = useAudioRecorder(OPTIONS);
  const recState = useAudioRecorderState(recorder, 200);
  const player = useAudioPlayer(null);
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const recording = recState.isRecording;
  const live = Math.floor((recState.durationMillis || 0) / 1000);
  // While recording show the live time; afterwards keep showing how long the recording is.
  const seconds = recording ? live : recordedSeconds;

  useEffect(() => {
    if (recording && live >= MAX_SECONDS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, recording]);

  async function start() {
    setError(null);
    setResult(null);
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
      setRecordedSeconds(live);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const u = recorder.uri;
      setUri(u);
      if (u) player.replace({ uri: u });
    } catch {
      setError('Recording could not be saved. Try again.');
    }
  }

  async function score() {
    if (!uri) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('referenceText', SENTENCE);
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('wav') ? 'wav' : 'm4a';
        form.append('audio', blob, `voice-check.${ext}`);
      } else {
        // Expo's fetch needs a real Blob; expo-file-system's File is one, backed by the recording on disk.
        form.append('audio', new File(uri), 'voice-check.m4a');
      }
      setResult(await api<Result>('/api/speech/assess', { method: 'POST', form, token }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Scoring failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const hint = recording ? 'Tap to stop' : uri ? 'Your recording · tap to record again' : 'Tap to start recording';

  return (
    <Screen tabs={false} edges={['left', 'right', 'bottom']}>
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="eyebrow">Read this aloud</ThemedText>
        <Card>
          <ThemedText type="subtitle">{`“${SENTENCE}”`}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listen to the sentence"
            onPress={() => Speech.speak(SENTENCE, { language: 'en-GB', rate: 0.95 })}
            style={({ pressed }) => [styles.listen, { backgroundColor: theme.backgroundSelected }, pressed && { opacity: 0.7 }]}>
            <Ionicons name="volume-high-outline" size={18} color={theme.text} />
            <ThemedText type="smallBold">Listen first</ThemedText>
          </Pressable>
        </Card>
      </View>

      <View style={styles.recorder}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
          onPress={recording ? stop : start}
          style={({ pressed }) => [
            styles.ring,
            { borderColor: recording ? theme.bad : theme.border },
            pressed && { transform: [{ scale: 0.96 }] },
          ]}>
          <View style={[styles.recordButton, { backgroundColor: recording ? theme.bad : theme.accent }]}>
            <Ionicons name={recording ? 'stop' : 'mic'} size={34} color={recording ? '#FFFFFF' : theme.accentText} />
          </View>
        </Pressable>
        <ThemedText type="number" style={{ color: recording ? theme.bad : theme.text }}>
          {`0:${String(seconds).padStart(2, '0')}`}
        </ThemedText>
        <ThemedText type="caption">{recording ? `Recording · stops at 0:${MAX_SECONDS}` : hint}</ThemedText>
      </View>

      {uri && !recording && (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button label="Play" icon="play" variant="secondary" onPress={() => { player.seekTo(0); player.play(); }} />
          </View>
          <View style={{ flex: 1.6 }}>
            <Button label="Check my pronunciation" onPress={score} loading={busy} />
          </View>
        </View>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {result && <ResultView result={result} />}
    </Screen>
  );
}

function ResultView({ result }: { result: Result }) {
  const theme = useTheme();
  if (result.dryRun) {
    return (
      <Notice tone="success">
        <ThemedText type="smallBold">Your microphone works</ThemedText>
        <ThemedText type="small">
          {`The server received ${result.converted.seconds} seconds of audio. `}
          {result.speechConfigured ? '' : 'Pronunciation scores appear once the Azure Speech key is added to the server.'}
        </ThemedText>
      </Notice>
    );
  }
  if (result.status !== 'Success') {
    return <Notice tone="error">No speech was recognised. Hold the phone a little closer and try again.</Notice>;
  }
  const overall = Math.round(result.scores.pronunciation ?? 0);
  const rows: [string, number | null][] = [
    ['Accuracy', result.scores.accuracy],
    ['Fluency', result.scores.fluency],
    ['Completeness', result.scores.completeness],
    ['Rhythm', result.scores.prosody],
  ];
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <ThemedText type="eyebrow">Pronunciation</ThemedText>
          <ThemedText type="number">
            {overall}
            <ThemedText type="heading" themeColor="textSecondary">{' / 100'}</ThemedText>
          </ThemedText>
        </View>
        <Pill label={overall >= 80 ? 'Clear' : overall >= 60 ? 'Mostly clear' : 'Needs practice'} />
      </View>
      {rows.filter(([, v]) => v !== null).map(([label, v]) => (
        <View key={label} style={styles.scoreRow}>
          <ThemedText type="small" style={{ width: 104 }}>{label}</ThemedText>
          <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
            <View style={{ width: `${v}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
          </View>
          <ThemedText type="smallBold" style={{ width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{Math.round(v ?? 0)}</ThemedText>
        </View>
      ))}
      <ThemedText type="eyebrow" style={{ marginTop: Spacing.two }}>Word by word</ThemedText>
      <View style={styles.words}>
        {result.words.map((w, i) => {
          const weak = w.errorType !== 'None' || (w.accuracy ?? 100) < 60;
          return (
            <View key={`${w.word}-${i}`} style={[styles.word, { backgroundColor: weak ? theme.badSoft : theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ color: weak ? theme.bad : theme.text }}>{w.word}</ThemedText>
            </View>
          );
        })}
      </View>
      <ThemedText type="caption">Words in red need more practice.</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  listen: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  recorder: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  ring: { width: 112, height: 112, borderRadius: 56, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  recordButton: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.two },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  word: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
});
