import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Field } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Screen } from '@/components/ui';
import { Radius, SEMIBOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, authApi, PASSWORD_MIN } from '@/lib/api';
import { useSession } from '@/lib/session';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = validEmail && (mode === 'signIn' ? password.length > 0 : password.length >= PASSWORD_MIN);

  async function submit() {
    if (!ready || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = mode === 'signIn' ? await authApi.signIn(email.trim(), password) : await authApi.signUp(email.trim(), password, name);
      await signIn(r.token, r.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
      if (e instanceof ApiError && e.code === 'email_taken') setMode('signIn');
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setForgot(false);
    setPassword('');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tabs={false} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: theme.accent }]}>
            <Ionicons name="school" size={26} color={theme.accentText} />
          </View>
          <ThemedText type="title" accessibilityRole="header">
            {mode === 'signIn' ? 'Learn English with a plan made for you' : 'Create your account'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {mode === 'signIn'
              ? 'Find your level, follow a daily plan, and see your progress.'
              : 'Your level, plan and progress are saved to your account and sync across your devices.'}
          </ThemedText>
        </View>

        <View style={styles.form}>
          {mode === 'signUp' && (
            <Field
              label="First name"
              value={name}
              onChangeText={setName}
              placeholder="Optional"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              editable={!busy}
              maxLength={60}
            />
          )}
          <Field
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!busy}
          />
          <Field
            ref={passwordRef}
            label="Password"
            password
            value={password}
            onChangeText={setPassword}
            hint={mode === 'signUp' ? `At least ${PASSWORD_MIN} characters.` : undefined}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!busy}
            maxLength={128}
          />
          <Button label={mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} disabled={!ready} />
          {mode === 'signIn' && (
            <Pressable accessibilityRole="button" onPress={() => setForgot((v) => !v)} style={styles.link} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Forgot your password?
              </ThemedText>
            </Pressable>
          )}
        </View>

        {forgot && <Notice>Ask the person who runs the app to give you a new password. You can change it afterwards under Progress, then Account.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <View style={[styles.switch, { borderTopColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {mode === 'signIn' ? 'New here?' : 'Already have an account?'}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')} hitSlop={8}>
            <ThemedText type="small" style={{ fontWeight: SEMIBOLD }}>
              {mode === 'signIn' ? 'Create an account' : 'Sign in'}
            </ThemedText>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.three - 4, marginTop: Spacing.six - Spacing.three },
  mark: { width: 52, height: 52, borderRadius: Radius.md + 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  form: { gap: Spacing.three },
  link: { alignSelf: 'center', paddingVertical: Spacing.one },
  switch: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
});
