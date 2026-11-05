import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { McqStep, SectionIntro, SpeakingStep, WritingStep } from '@/components/placement/steps';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Screen } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { placementApi, SECTION_INFO, type Step } from '@/lib/placement';
import { useSession } from '@/lib/session';
import { storage } from '@/lib/storage';

export default function PlacementTestScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const { restart } = useLocalSearchParams<{ restart?: string }>();
  const [step, setStep] = useState<Step | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState<Set<string>>(new Set());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const started = useRef(false);

  const load = useCallback(
    async (fresh = false) => {
      if (!token) return;
      setLoadError(null);
      try {
        const r = await placementApi.start(token, fresh);
        setStep(r.step);
      } catch (e) {
        setLoadError(e instanceof ApiError ? e.message : 'The test could not be loaded. Try again.');
      }
    },
    [token],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load(restart === '1');
  }, [load, restart]);

  useEffect(() => {
    if (step?.kind === 'done') {
      storage.remove(`ec_writing_${step.testId}`).catch(() => {});
      router.replace({ pathname: '/placement/results/[id]', params: { id: step.testId } });
    }
  }, [step]);

  /** Sends one answer. On a conflict (a double tap, or the test moved on elsewhere) it reloads the current step. */
  async function send(call: () => Promise<{ step: Step }>) {
    setBusy(true);
    setError(null);
    try {
      const r = await call();
      setStep(r.step);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await load();
      } else {
        setError(e instanceof ApiError ? e.message : 'Your answer could not be saved. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    Speech.stop();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (!step || step.kind === 'done') {
    return (
      <Screen tabs={false} edges={['top', 'left', 'right', 'bottom']}>
        {loadError ? (
          <View style={{ gap: Spacing.three, paddingTop: Spacing.six }}>
            <Notice tone="error">{loadError}</Notice>
            <Button label="Try again" onPress={() => load(restart === '1')} />
            <Button label="Back" variant="secondary" onPress={leave} />
          </View>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={theme.text} />
            <ThemedText type="caption">{step?.kind === 'done' ? 'Working out your level…' : 'Loading your test…'}</ThemedText>
          </View>
        )}
      </Screen>
    );
  }

  const info = SECTION_INFO[step.section];
  const showIntro = step.sectionStart && !introDone.has(step.section);
  const pct = Math.round(step.progress * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <View style={styles.barInner}>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave the test" hitSlop={10} onPress={() => setConfirmLeave((v) => !v)} style={styles.close}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.barText}>
              <ThemedText type="smallBold">{info.name}</ThemedText>
              <ThemedText type="caption">{`Part ${step.sectionIndex + 1} of ${step.sectionCount}`}</ThemedText>
            </View>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Test progress"
              accessibilityValue={{ min: 0, max: 100, now: pct }}
              style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View style={{ width: `${Math.max(3, pct)}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: theme.accent }} />
            </View>
          </View>
        </View>
        {confirmLeave && (
          <View style={[styles.leave, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="heading">Take a break?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your answers are saved. Continue any time in the next 7 days from the Today screen.
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={{ flex: 1 }}>
                <Button label="Keep going" variant="secondary" onPress={() => setConfirmLeave(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Leave" onPress={leave} />
              </View>
            </View>
          </View>
        )}
      </View>

      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        {showIntro ? (
          <SectionIntro section={step.section} index={step.sectionIndex} count={step.sectionCount} onStart={() => setIntroDone((s) => new Set(s).add(step.section))} />
        ) : step.kind === 'mcq' ? (
          <McqStep
            key={step.item.id}
            item={step.item}
            section={step.section}
            questionNumber={step.questionNumber}
            busy={busy}
            onAnswer={(choice) => send(() => placementApi.answer(token!, step.testId, step.item.id, choice))}
          />
        ) : step.kind === 'writing' ? (
          <WritingStep
            testId={step.testId}
            prompt={step.prompt.text}
            targetWords={step.targetWords}
            maxChars={step.maxChars}
            busy={busy}
            onSubmit={(text) => send(() => placementApi.writing(token!, step.testId, text))}
          />
        ) : (
          <SpeakingStep
            key={`${step.testId}-${step.taskIndex}`}
            taskIndex={step.taskIndex}
            taskCount={step.taskCount}
            prompt={step.prompt.text}
            maxSeconds={step.maxSeconds}
            busy={busy}
            error={error}
            onSubmit={(form) => {
              form.append('testId', step.testId);
              form.append('taskIndex', String(step.taskIndex));
              send(() => placementApi.speaking(token!, form));
            }}
            onSkip={() => {
              const form = new FormData();
              form.append('testId', step.testId);
              form.append('taskIndex', String(step.taskIndex));
              form.append('skip', '1');
              send(() => placementApi.speaking(token!, form));
            }}
          />
        )}
        {error && step.kind !== 'speaking' && <Notice tone="error">{error}</Notice>}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingTop: Spacing.six * 2 },
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three + 4, paddingVertical: Spacing.three - 4, gap: Spacing.three },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  barText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  leave: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two + 4 },
});
