import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ListRow, Notice, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { placementApi, SECTION_INFO, type Section as Part, type Step, type Summary } from '@/lib/placement';
import { useSession } from '@/lib/session';

const PARTS: Part[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'];

export default function PlacementIntroScreen() {
  const { token } = useSession();
  const [active, setActive] = useState<Step | null>(null);
  const [latest, setLatest] = useState<Summary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      placementApi
        .status(token)
        .then((r) => {
          setActive(r.active);
          setLatest(r.latest);
          setError(null);
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not check your test. Try again.'))
        .finally(() => setLoaded(true));
    }, [token]),
  );

  const resumable = active && active.kind !== 'done' ? active : null;

  return (
    <Screen
      tabs={false}
      edges={['left', 'right', 'bottom']}
      eyebrow="About 30 minutes"
      title="Placement test"
      subtitle="Find your English level on the CEFR scale, from A1 to C2, with a level for each skill and matching IELTS, TOEFL and Cambridge scores.">
      <Section title="Six parts" footer="The multiple-choice parts adapt to you, like the Oxford Placement Test: right answers bring harder questions, and wrong ones bring easier questions.">
        {PARTS.map((p, i) => (
          <ListRow key={p} icon={SECTION_INFO[p].icon} title={SECTION_INFO[p].name} detail={`About ${SECTION_INFO[p].minutes} minutes`} last={i === PARTS.length - 1} />
        ))}
      </Section>

      <Section title="Before you begin">
        <ListRow icon="volume-high-outline" title="Sound on" detail="The listening part plays recordings" />
        <ListRow icon="mic-outline" title="A quiet place" detail="You answer two questions out loud" />
        <ListRow icon="pause-outline" title="Pause any time" detail="Answers are saved. Continue within 7 days" last />
      </Section>

      <Notice>{"You won't see right or wrong answers during the test, as in real exams. Your results show every mistake with an explanation."}</Notice>

      {error && <Notice tone="error">{error}</Notice>}

      <View style={{ gap: Spacing.two }}>
        {resumable ? (
          <>
            <Button label={`Continue · ${SECTION_INFO[resumable.section].name}`} icon="play" onPress={() => router.push('/placement/test')} />
            <Button
              label={confirmRestart ? 'Tap again to start over' : 'Start over'}
              variant={confirmRestart ? 'danger' : 'ghost'}
              onPress={() => (confirmRestart ? router.push({ pathname: '/placement/test', params: { restart: '1' } }) : setConfirmRestart(true))}
            />
            {confirmRestart && (
              <ThemedText type="caption" style={{ textAlign: 'center' }}>
                Starting over deletes the answers of your unfinished test.
              </ThemedText>
            )}
          </>
        ) : (
          <Button label={latest ? 'Retake the test' : 'Start the test'} icon="arrow-forward" onPress={() => router.push('/placement/test')} disabled={!loaded && !error} />
        )}
        {latest && (
          <Button
            label={`See your last result · ${latest.overall.label}`}
            variant="secondary"
            onPress={() => router.push({ pathname: '/placement/results/[id]', params: { id: latest.testId } })}
          />
        )}
      </View>
    </Screen>
  );
}
