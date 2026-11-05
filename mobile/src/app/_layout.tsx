import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useSession();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

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
