import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Field } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, authApi, PASSWORD_MIN } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const { token } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const nextRef = useRef<ComponentRef<typeof TextInput>>(null);

  const ready = next.length >= PASSWORD_MIN && next !== current;

  async function save() {
    if (!token || !ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword(token, current, next);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Your password could not be changed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tabs={false} edges={['left', 'right', 'bottom']}>
        {done ? (
          <View style={styles.form}>
            <Notice>Your password is changed. Use the new one next time you sign in.</Notice>
            <Button label="Done" onPress={close} />
          </View>
        ) : (
          <View style={styles.form}>
            <ThemedText themeColor="textSecondary">Enter your current password, then choose a new one.</ThemedText>
            <Field
              label="Current password"
              password
              value={current}
              onChangeText={setCurrent}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => nextRef.current?.focus()}
              editable={!busy}
              maxLength={128}
            />
            <Field
              ref={nextRef}
              label="New password"
              password
              value={next}
              onChangeText={setNext}
              hint={next && next === current ? 'Choose a password different from the current one.' : `At least ${PASSWORD_MIN} characters.`}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={save}
              editable={!busy}
              maxLength={128}
            />
            <Button label="Change password" onPress={save} loading={busy} disabled={!ready} />
            {error && <Notice tone="error">{error}</Notice>}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, marginTop: Spacing.three },
});
