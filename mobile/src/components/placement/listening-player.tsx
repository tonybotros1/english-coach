import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Line = { speaker: 'A' | 'B'; text: string };
type VoicePair = { A: Speech.SpeechOptions; B: Speech.SpeechOptions };

let voicesPromise: Promise<VoicePair> | null = null;

/**
 * Picks two different English voices for speakers A and B. If the phone has only one voice,
 * speaker B gets a lower pitch so the two people still sound different.
 */
export function loadVoices(): Promise<VoicePair> {
  voicesPromise ??= Speech.getAvailableVoicesAsync()
    .then((all) => {
      const english = all.filter((v) => v.language?.toLowerCase().startsWith('en'));
      const rank = (lang: string) => (lang.toLowerCase().includes('gb') ? 0 : lang.toLowerCase().includes('us') ? 1 : 2);
      const sorted = [...english].sort((a, b) => rank(a.language) - rank(b.language) || (b.quality === 'Enhanced' ? 1 : 0) - (a.quality === 'Enhanced' ? 1 : 0));
      const a = sorted[0];
      const b = sorted.find((v) => v.identifier !== a?.identifier && v.language !== a?.language) ?? sorted.find((v) => v.identifier !== a?.identifier);
      const base: Speech.SpeechOptions = { language: 'en-GB', rate: 0.9 };
      return {
        A: { ...base, ...(a ? { voice: a.identifier, language: a.language } : {}), pitch: 1.05 },
        B: { ...base, ...(b ? { voice: b.identifier, language: b.language } : {}), pitch: b ? 1 : 0.8 },
      };
    })
    .catch(() => ({ A: { language: 'en-GB', rate: 0.9 }, B: { language: 'en-GB', rate: 0.9, pitch: 0.8 } }));
  return voicesPromise;
}

/** Plays a short recording with text-to-speech. The learner hears it but never sees the words. */
export function ListeningPlayer({ lines, maxPlays = 2 }: { lines: Line[]; maxPlays?: number }) {
  const theme = useTheme();
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    loadVoices();
    const runs = run; // a counter that cancels pending lines, not a rendered node
    return () => {
      runs.current++;
      Speech.stop();
    };
  }, []);

  async function play() {
    if (playing || plays >= maxPlays) return;
    const id = ++run.current;
    const voices = await loadVoices();
    setPlays((p) => p + 1);
    setPlaying(true);
    const speakLine = (i: number) => {
      if (run.current !== id) return;
      if (i >= lines.length) {
        setPlaying(false);
        return;
      }
      const next = () => {
        setTimeout(() => speakLine(i + 1), 350);
      };
      Speech.speak(lines[i].text, { ...voices[lines[i].speaker], onDone: next, onError: next, onStopped: () => setPlaying(false) });
    };
    Speech.stop();
    speakLine(0);
  }

  const left = maxPlays - plays;
  const label = playing ? 'Playing…' : plays === 0 ? 'Play recording' : left > 0 ? 'Play again' : 'No plays left';
  return (
    <View style={[styles.wrap, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: playing || left <= 0, busy: playing }}
        disabled={playing || left <= 0}
        onPress={play}
        style={({ pressed }) => [styles.play, { backgroundColor: left > 0 || playing ? theme.accent : theme.disabled }, pressed && { opacity: 0.85 }]}>
        <Ionicons name={playing ? 'volume-high' : 'play'} size={24} color={left > 0 || playing ? theme.accentText : theme.disabledText} />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="heading">{label}</ThemedText>
        <ThemedText type="caption">{lines.some((l) => l.speaker === 'B') ? 'Two speakers' : 'One speaker'} · {left > 0 ? `${left} of ${maxPlays} plays left` : 'Answer from what you heard'}</ThemedText>
      </View>
      <View style={styles.dots}>
        {Array.from({ length: maxPlays }).map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i < plays ? theme.accent : theme.backgroundSelected }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
