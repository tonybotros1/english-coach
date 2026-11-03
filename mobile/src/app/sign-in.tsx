import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Notice, Screen } from '@/components/ui';
import { Radius, Spacing, SEMIBOLD } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, authApi } from '@/lib/api';
import { useSession } from '@/lib/session';

const RESEND_SECONDS = 30;
const CODE_LENGTH = 6;

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  async function sendCode() {
    if (!validEmail || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await authApi.requestCode(email);
      setEmail(r.email);
      setDevCode(r.devCode ?? null);
      setCode(r.devCode ?? '');
      setStep('code');
      setCooldown(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 80);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (value.length !== CODE_LENGTH || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await authApi.verify(email, value);
      await signIn(r.token, r.user);
    } catch (e) {
      setError(message(e));
      setCode('');
      setBusy(false);
      codeRef.current?.focus();
    }
  }

  function onCodeChange(t: string) {
    const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) verify(digits);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tabs={false} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: theme.accent }]}>
            <Ionicons name="school" size={26} color={theme.accentText} />
          </View>
          <ThemedText type="title" accessibilityRole="header">
            {step === 'email' ? 'Learn English with a plan made for you' : 'Check your email'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {step === 'email'
              ? 'Find your level, follow a daily plan, and see your progress. Sign in with your email. No password needed.'
              : `Enter the ${CODE_LENGTH}-digit code we sent to`}
          </ThemedText>
          {step === 'code' && (
            <View style={styles.emailRow}>
              <ThemedText type="heading">{email}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change email"
                hitSlop={10}
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                  setDevCode(null);
                }}>
                <ThemedText type="link">Change</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <ThemedText type="smallBold" nativeID="emailLabel">
              Email
            </ThemedText>
            <TextInput
              accessibilityLabelledBy="emailLabel"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: focused ? theme.accent : theme.border },
              ]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="you@example.com"
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              editable={!busy}
            />
            <Button label="Continue" onPress={sendCode} loading={busy} disabled={!validEmail} />
          </View>
        ) : (
          <View style={styles.form}>
            <Pressable onPress={() => codeRef.current?.focus()} accessible={false}>
              <View style={styles.codeRow}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const active = focused && i === Math.min(code.length, CODE_LENGTH - 1);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.codeBox,
                        { backgroundColor: theme.backgroundElement, borderColor: active ? theme.accent : code[i] ? theme.borderStrong : theme.border },
                      ]}>
                      <ThemedText style={styles.codeDigit}>{code[i] ?? ''}</ThemedText>
                    </View>
                  );
                })}
              </View>
              <TextInput
                ref={codeRef}
                accessibilityLabel={`${CODE_LENGTH}-digit code`}
                style={styles.hiddenInput}
                value={code}
                onChangeText={onCodeChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={CODE_LENGTH}
                caretHidden
                editable={!busy}
              />
            </Pressable>
            <Button label="Sign in" onPress={() => verify()} loading={busy} disabled={code.length !== CODE_LENGTH} />
            <Pressable accessibilityRole="button" disabled={cooldown > 0 || busy} onPress={sendCode} style={styles.resend} hitSlop={8}>
              <ThemedText type="small" themeColor={cooldown > 0 ? 'textTertiary' : 'text'} style={{ fontWeight: SEMIBOLD }}>
                {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {devCode && <Notice>{`Development mode: email isn't set up yet, so your code (${devCode}) was filled in for you.`}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <ThemedText type="caption" style={{ textAlign: 'center' }}>
          Your progress is saved to your account and syncs across your devices.
        </ThemedText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.three - 4, marginTop: Spacing.six - Spacing.three },
  mark: { width: 52, height: 52, borderRadius: Radius.md + 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  form: { gap: Spacing.three - 4 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.three, minHeight: 52, fontSize: 16 },
  codeRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'space-between' },
  codeBox: { flex: 1, aspectRatio: 0.86, maxHeight: 64, borderWidth: 1.5, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  codeDigit: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  hiddenInput: { position: 'absolute', inset: 0, opacity: 0.01, fontSize: 1 },
  resend: { alignSelf: 'center', paddingVertical: Spacing.two },
});
