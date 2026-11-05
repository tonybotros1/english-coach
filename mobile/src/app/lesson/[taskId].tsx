import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrammarLesson, LessonResults, ListeningLesson, ReadingLesson, SpeakingLesson, VocabularyLesson, WritingLesson } from '@/components/lessons/kinds';
import { KIND_ICON } from '@/components/plan/task-row';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Pill, Screen } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { lessonApi, type Lesson } from '@/lib/lessons';
import { SECTION_INFO, type Section } from '@/lib/placement';
import { useSession } from '@/lib/session';

const PREPARING = ['Choosing examples for your level…', 'Writing practice questions…', 'Checking every answer…'];

export default function LessonScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<{ message: string; setup: boolean } | null>(null);
  const [tick, setTick] = useState(0);

  // Bumping `attempt` reloads; the error is cleared by the Try again button, not inside the effect.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!token || !taskId) return;
    const signal = { cancelled: false };
    lessonApi
      .open(token, taskId, signal)
      .then((l) => !signal.cancelled && setLesson(l))
      .catch((e) => {
        if (signal.cancelled) return;
        const setup = e instanceof ApiError && e.code === 'not_configured';
        setError({
          setup,
          message: setup
            ? 'Lessons are written by AI, and the server does not have its Gemini key yet. Add GEMINI_API_KEY to the server settings, then try again.'
            : e instanceof ApiError
              ? e.message
              : 'The lesson could not be loaded. Check your connection and try again.',
        });
      });
    return () => {
      signal.cancelled = true;
    };
  }, [token, taskId, attempt]);
  const retry = () => {
    setError(null);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (lesson) return;
    const t = setInterval(() => setTick((n) => n + 1), 2500);
    return () => clearInterval(t);
  }, [lesson]);

  const close = () => {
    Speech.stop();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const kind = (lesson?.kind ?? (taskId?.split('-').pop() as Section | undefined)) as Section | undefined;
  const name = kind && kind in SECTION_INFO ? SECTION_INFO[kind].name : 'Lesson';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'left', 'right']}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <View style={styles.barInner}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close the lesson" hitSlop={10} onPress={close} style={styles.close}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="smallBold">{name}</ThemedText>
            {lesson && (
              <ThemedText type="caption" numberOfLines={1}>
                {`${lesson.levelName} · ${lesson.minutes} min · ${lesson.topic}`}
              </ThemedText>
            )}
          </View>
          {lesson?.status === 'completed' && <Pill label="Done" icon="checkmark" />}
        </View>
      </View>

      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        {!lesson && !error && (
          <View style={styles.center}>
            <View style={[styles.icon, { backgroundColor: theme.accent }]}>
              <Ionicons name={kind ? KIND_ICON[kind] : 'book-outline'} size={28} color={theme.accentText} />
            </View>
            <ThemedText type="subtitle">Preparing your lesson</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {PREPARING[tick % PREPARING.length]}
            </ThemedText>
            <ActivityIndicator color={theme.text} />
            <ThemedText type="caption" style={{ textAlign: 'center' }}>
              The first time takes up to a minute. After that it opens instantly.
            </ThemedText>
          </View>
        )}
        {error && (
          <View style={{ gap: Spacing.three, paddingTop: Spacing.five }}>
            <Notice tone="error">{error.message}</Notice>
            {!error.setup && <Button label="Try again" onPress={retry} />}
            <Button label="Back" variant="secondary" onPress={close} />
          </View>
        )}
        {lesson && token && <LessonBody lesson={lesson} token={token} onFinished={setLesson} />}
      </Screen>
    </SafeAreaView>
  );
}

function LessonBody({ lesson, token, onFinished }: { lesson: Lesson; token: string; onFinished: (l: Lesson) => void }) {
  if (lesson.status === 'completed' && lesson.result) return <LessonResults lesson={lesson} />;
  const props = { token, onFinished };
  switch (lesson.content.kind) {
    case 'grammar':
      return <GrammarLesson lesson={lesson as never} {...props} />;
    case 'vocabulary':
      return <VocabularyLesson lesson={lesson as never} {...props} />;
    case 'reading':
      return <ReadingLesson lesson={lesson as never} {...props} />;
    case 'listening':
      return <ListeningLesson lesson={lesson as never} {...props} />;
    case 'writing':
      return <WritingLesson lesson={lesson as never} {...props} />;
    case 'speaking':
      return <SpeakingLesson lesson={lesson as never} {...props} />;
  }
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three + 4, paddingVertical: Spacing.three - 4 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.six },
  icon: { width: 64, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
});
