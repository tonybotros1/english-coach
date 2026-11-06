import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { syncReminders } from '@/lib/reminders';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status, token } = useSession();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  // Keep the next 7 morning reminders up to date: when signed in, and each time the app comes back to the front.
  useEffect(() => {
    if (status !== 'signedIn' || !token) return;
    syncReminders(token).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncReminders(token).catch(() => {});
    });
    return () => sub.remove();
  }, [status, token]);

  // Tapping a morning reminder opens Today.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate('/'));
    return () => sub.remove();
  }, []);

  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';
  const header = {
    headerShown: true,
    headerTintColor: Colors[scheme].text,
    headerStyle: { backgroundColor: Colors[scheme].background },
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '600' as const },
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors[scheme].background } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="voice-check" options={{ ...header, title: 'Voice check', presentation: 'modal' }} />
        <Stack.Screen name="placement/index" options={{ ...header, title: '' }} />
        {/* No swipe-back during the test, so a stray gesture never interrupts an answer. Leaving is the close button. */}
        <Stack.Screen name="placement/test" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="placement/results/[id]" options={{ ...header, title: 'Your results' }} />
        <Stack.Screen name="plan-setup" options={{ ...header, title: '', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="lesson/[taskId]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="weekly/[taskId]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="change-password" options={{ ...header, title: 'Change password', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}
