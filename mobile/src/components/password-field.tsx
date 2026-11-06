import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<TextInputProps, 'style'> & { label: string; hint?: string; password?: boolean };

/** A labelled text field. With `password`, the text is hidden and an eye button shows or hides it. */
export const Field = forwardRef<ComponentRef<typeof TextInput>, Props>(function Field({ label, hint, password, ...input }, ref) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const id = `field-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" nativeID={id}>
        {label}
      </ThemedText>
      <View style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: focused ? theme.accent : theme.border }]}>
        <TextInput
          ref={ref}
          accessibilityLabelledBy={id}
          accessibilityLabel={label}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.textTertiary}
          autoCapitalize={password ? 'none' : input.autoCapitalize}
          autoCorrect={false}
          secureTextEntry={password && !visible}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            hitSlop={10}
            onPress={() => setVisible((v) => !v)}
            style={styles.eye}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      {hint ? <ThemedText type="caption">{hint}</ThemedText> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one + 2 },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radius.md, minHeight: 52 },
  input: { flex: 1, paddingHorizontal: Spacing.three, minHeight: 52, fontSize: 16 },
  eye: { paddingHorizontal: Spacing.three, height: 52, justifyContent: 'center' },
});
