import { useState } from 'react';
import { Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ListRow, Notice, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useSession } from '@/lib/session';

export default function ProgressScreen() {
  const theme = useTheme();
  const { user, signOut, updateProfile } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function toggleEmail(value: boolean) {
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ emailOptIn: value });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save that change. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen eyebrow="Progress" title="Your progress">
      <Card>
        <Icon name="stats-chart-outline" size={28} />
        <ThemedText type="heading">Your skills appear after the placement test</ThemedText>
        <ThemedText themeColor="textSecondary">
          You&apos;ll see your level in each skill, the minutes you study each week, and which mistakes are fading.
        </ThemedText>
      </Card>

      <Section title="Reminders" footer="We send today's tasks at 7:00 AM in your time zone.">
        <ListRow
          icon="mail-outline"
          title="Morning email"
          detail={user?.timezone ? `7:00 AM · ${user.timezone}` : '7:00 AM your time'}
          last
          trailing={
            <Switch
              accessibilityLabel="Morning email"
              value={user?.emailOptIn ?? true}
              onValueChange={toggleEmail}
              disabled={saving}
              trackColor={{ true: theme.accent, false: theme.borderStrong }}
              thumbColor={theme.backgroundElement}
              ios_backgroundColor={theme.borderStrong}
            />
          }
        />
      </Section>
      {error && <Notice tone="error">{error}</Notice>}

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
