import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ListRow, Notice, Screen, Section } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { LEVELS, SECTION_INFO, type Section as Skill } from '@/lib/placement';
import { progressApi, type ProgressView } from '@/lib/progress';
import { getReminderSettings, nextReminder, permissionState, REMINDER_HOURS, saveReminderSettings, syncReminders, type ReminderSettings } from '@/lib/reminders';
import { useSession } from '@/lib/session';

const SKILLS: Skill[] = ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking'];
const CHART_HEIGHT = 140;
const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function Stat({ value, label, detail }: { value: string; label: string; detail?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="subtitle" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
      <ThemedText type="caption">{label}</ThemedText>
      {detail ? <ThemedText type="caption" themeColor="textTertiary">{detail}</ThemedText> : null}
    </View>
  );
}

/** Minutes per week as thin bars against the plan's weekly target. Tap a bar to read its value. */
function WeeklyChart({ weeks }: { weeks: ProgressView['weeks'] }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const target = weeks.find((w) => w.target)?.target ?? null;
  const max = Math.max(30, target ?? 0, ...weeks.map((w) => w.minutes)) * 1.1;
  const shown = selected ?? weeks.findIndex((w) => w.current);
  const w = weeks[shown];
  return (
    <Card>
      <View style={styles.chartHead}>
        <ThemedText type="eyebrow">Minutes per week</ThemedText>
        {w && (
          <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
            {`${w.label} · ${w.minutes}${w.target ? ` of ${w.target}` : ''} min`}
          </ThemedText>
        )}
      </View>
      <View style={{ height: CHART_HEIGHT }} accessible accessibilityLabel={`Minutes per week: ${weeks.map((x) => `${x.label} ${x.minutes}`).join(', ')}${target ? `. Target ${target}` : ''}`}>
        {/* Recessive baseline and target line, so the bars carry the eye. */}
        <View style={[styles.baseline, { backgroundColor: theme.borderStrong }]} />
        {target && (
          <View style={[styles.targetLine, { bottom: (target / max) * CHART_HEIGHT, borderColor: theme.textTertiary }]}>
            <ThemedText type="caption" style={[styles.targetLabel, { color: theme.textSecondary, backgroundColor: theme.backgroundElement }]}>
              {`Target ${target}`}
            </ThemedText>
          </View>
        )}
        <View style={styles.bars}>
          {weeks.map((x, i) => {
            const h = Math.max(x.minutes > 0 ? 4 : 0, (x.minutes / max) * CHART_HEIGHT);
            const on = i === shown;
            return (
              <Pressable
                key={x.start}
                accessibilityRole="button"
                accessibilityLabel={`${x.label}: ${x.minutes} minutes`}
                onPress={() => setSelected(i)}
                style={styles.barSlot}
                hitSlop={4}>
                <View style={[styles.bar, { height: h, backgroundColor: on ? theme.accent : theme.textTertiary }]} />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.barLabels}>
        {weeks.map((x, i) => (
          <ThemedText key={x.start} type="caption" style={{ flex: 1, textAlign: 'center', color: i === shown ? theme.text : theme.textTertiary, fontWeight: i === shown ? SEMIBOLD : 400 }}>
            {x.label}
          </ThemedText>
        ))}
      </View>
    </Card>
  );
}

/** Each skill's level at every test, on the Pre-A1 to C2 scale: older results lighter, the latest dark. */
function LevelHistory({ history }: { history: ProgressView['history'] }) {
  const theme = useTheme();
  const first = history[0];
  const last = history[history.length - 1];
  return (
    <Section
      title="Your levels"
      footer={history.length > 1 ? `From your placement test on ${shortDate(first.date)} to your latest ${last.kind === 'checkpoint' ? 'checkpoint' : 'test'} on ${shortDate(last.date)}.` : 'Checkpoint tests every 4 weeks add to this, so you can see each skill rise.'}>
      {SKILLS.map((s, i) => {
        const a = first.skills[s];
        const b = last.skills[s];
        const up = b.score - a.score;
        return (
          <View key={s} style={[styles.levelRow, i < SKILLS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderStrong }]}>
            <View style={styles.levelHead}>
              <ThemedText type="heading">{SECTION_INFO[s].name}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {history.length > 1 && a.label !== b.label && (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      {a.label}
                    </ThemedText>
                    <Icon name="arrow-forward" size={14} color="textSecondary" />
                  </>
                )}
                <ThemedText type="heading">{b.label}</ThemedText>
                {history.length > 1 && up !== 0 && (
                  <ThemedText type="caption" style={{ color: up > 0 ? theme.good : theme.bad }}>
                    {up > 0 ? `+${up.toFixed(1)}` : up.toFixed(1)}
                  </ThemedText>
                )}
              </View>
            </View>
            <View style={[styles.scale, { backgroundColor: theme.backgroundSelected }]}>
              {history.map((h, j) => (
                <View
                  key={h.testId}
                  style={[
                    styles.dot,
                    {
                      left: `${(Math.min(6, h.skills[s].score) / 6) * 100}%`,
                      backgroundColor: j === history.length - 1 ? theme.accent : theme.textTertiary,
                      borderColor: theme.backgroundElement,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        );
      })}
      <View style={styles.scaleLabels}>
        {LEVELS.map((l) => (
          <ThemedText key={l} type="caption" themeColor="textTertiary">
            {l === 'Pre-A1' ? 'Pre' : l}
          </ThemedText>
        ))}
      </View>
    </Section>
  );
}

function Reminders() {
  const theme = useTheme();
  const { token } = useSession();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [next, setNext] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<'granted' | 'ask' | 'denied' | null>(null);

  // Re-checked on focus, so coming back from the phone's settings updates the screen.
  useFocusEffect(
    useCallback(() => {
      getReminderSettings().then(setSettings);
      nextReminder().then(setNext).catch(() => {});
      permissionState().then(setPermission).catch(() => {});
    }, []),
  );

  async function update(change: Partial<ReminderSettings>) {
    if (!settings || !token) return;
    const s = { ...settings, ...change };
    setSettings(s);
    setError(null);
    try {
      await saveReminderSettings(s);
      await syncReminders(token, { askPermission: s.enabled });
      const p = await permissionState();
      setPermission(p);
      if (s.enabled && p === 'denied' && Platform.OS !== 'web') setError('Notifications are turned off for this app. Turn them on in your phone settings to get the morning reminder.');
      setNext(s.enabled ? await nextReminder() : null);
    } catch {
      setError('The reminder could not be set. Try again.');
    }
  }

  const blocked = settings?.enabled && permission !== null && permission !== 'granted';

  if (!settings) return null;
  return (
    <Section title="Morning reminder" footer="A notification each morning with that day's lessons and review cards. It works even when the app is closed.">
      <ListRow
        icon="notifications-outline"
        title="Daily reminder"
        detail={blocked ? 'Notifications are not allowed yet' : settings.enabled ? (next ? `Next: ${next.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${settings.hour}:00` : `Every day at ${settings.hour}:00`) : 'Off'}
        trailing={
          <Switch
            accessibilityLabel="Daily reminder"
            value={settings.enabled}
            onValueChange={(v) => update({ enabled: v })}
            trackColor={{ true: theme.accent, false: theme.borderStrong }}
            thumbColor={theme.backgroundElement}
            ios_backgroundColor={theme.borderStrong}
          />
        }
        last={!settings.enabled}
      />
      {settings.enabled && (
        <View style={styles.hours}>
          {REMINDER_HOURS.map((h) => {
            const on = settings.hour === h;
            return (
              <Pressable
                key={h}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${h}:00`}
                onPress={() => update({ hour: h })}
                style={[styles.hour, { backgroundColor: on ? theme.accent : theme.backgroundSelected }]}>
                <ThemedText style={{ fontWeight: SEMIBOLD, color: on ? theme.accentText : theme.text }}>{`${h}:00`}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}
      {blocked && !error && (
        <View style={{ padding: Spacing.three, paddingTop: 0 }}>
          {permission === 'ask' ? (
            <Button label="Allow notifications" icon="notifications-outline" variant="secondary" onPress={() => update({})} />
          ) : (
            <Button label="Open phone settings" icon="settings-outline" variant="secondary" onPress={() => Linking.openSettings()} />
          )}
        </View>
      )}
      {error && (
        <View style={{ padding: Spacing.three, paddingTop: 0, gap: Spacing.two }}>
          <Notice tone="error">{error}</Notice>
          {permission === 'denied' && <Button label="Open phone settings" icon="settings-outline" variant="secondary" onPress={() => Linking.openSettings()} />}
        </View>
      )}
    </Section>
  );
}

export default function ProgressScreen() {
  const { user, token, signOut } = useSession();
  const [data, setData] = useState<ProgressView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      progressApi
        .get(token)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your progress. Try again.'));
    }, [token]),
  );

  const thisWeek = data?.weeks.find((w) => w.current);
  return (
    <Screen eyebrow={data?.plan ? `Week ${data.plan.week} of ${data.plan.weeks}` : 'Progress'} title="Your progress">
      {!data && !error && <ActivityIndicator />}
      {error && <Notice tone="error">{error}</Notice>}

      {data && (
        <>
          <View style={styles.stats}>
            <Stat value={String(data.streak)} label={data.streak === 1 ? 'day in a row' : 'days in a row'} />
            <Stat value={String(thisWeek?.minutes ?? 0)} label="minutes this week" detail={thisWeek?.target ? `target ${thisWeek.target}` : undefined} />
            <Stat value={String(data.cards.learned)} label="cards learned" />
          </View>

          <WeeklyChart weeks={data.weeks} />

          {data.history.length > 0 ? (
            <LevelHistory history={data.history} />
          ) : (
            <Card>
              <ThemedText type="heading">Your levels appear after the placement test</ThemedText>
              <Button label="Start the placement test" variant="secondary" onPress={() => router.push('/placement')} />
            </Card>
          )}

          <Section title="Review cards" footer="Learned means the next review is three weeks or more away. Recall is how often you remembered a learned card in the last 30 days.">
            <ListRow icon="checkmark-done-outline" title="Learned" trailing={<ThemedText type="heading">{data.cards.learned}</ThemedText>} />
            <ListRow icon="repeat-outline" title="Still learning" trailing={<ThemedText type="heading">{data.cards.learning}</ThemedText>} />
            <ListRow icon="sparkles-outline" title="New, waiting" trailing={<ThemedText type="heading">{data.cards.new}</ThemedText>} />
            <ListRow
              icon="pulse-outline"
              title="Recall, last 30 days"
              detail={data.cards.reviews30 ? `${data.cards.reviews30} reviews of learned cards` : 'Shows once cards come back for review'}
              trailing={<ThemedText type="heading">{data.cards.recall30 === null ? '—' : `${data.cards.recall30}%`}</ThemedText>}
              last
            />
          </Section>

          {data.plan && (
            <Section title="Your plan">
              <ListRow icon="map-outline" title="Lessons and reviews done" detail={`Week ${data.plan.week} of ${data.plan.weeks}`} trailing={<ThemedText type="heading">{`${data.plan.done}/${data.plan.total}`}</ThemedText>} last />
            </Section>
          )}
        </>
      )}

      <Reminders />

      <Section title="Account">
        <ListRow icon="person-circle-outline" title={user?.email ?? ''} detail="Signed in with an emailed code" />
        <ListRow icon="log-out-outline" title="Sign out" tone="danger" onPress={() => setConfirm(true)} last />
      </Section>

      {confirm && (
        <Card>
          <ThemedText type="heading">Sign out of this phone?</ThemedText>
          <ThemedText themeColor="textSecondary">Your progress stays saved in your account.</ThemedText>
          <View style={{ gap: Spacing.two }}>
            <Button label="Sign out" variant="danger" onPress={signOut} />
            <Button label="Cancel" variant="ghost" onPress={() => setConfirm(false)} />
          </View>
        </Card>
      )}

      <ThemedText type="caption" style={{ textAlign: 'center' }}>{`Connected to ${API_URL}`}</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three - 4, gap: 2 },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  baseline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  targetLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  targetLabel: { position: 'absolute', right: 0, top: -9, paddingHorizontal: 4, fontSize: 11, lineHeight: 16 },
  bars: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '62%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabels: { flexDirection: 'row', gap: 2 },
  levelRow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three - 2, gap: 10 },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  scale: { height: 6, borderRadius: Radius.pill, marginHorizontal: 5 },
  dot: { position: 'absolute', top: -5, width: 16, height: 16, marginLeft: -8, borderRadius: 8, borderWidth: 2 },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingBottom: Spacing.three - 4 },
  hours: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  hour: { flex: 1, minHeight: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
