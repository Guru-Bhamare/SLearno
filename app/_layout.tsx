import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { SessionProvider } from '@/context/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';

export const unstable_settings = {
  anchor: '(tabs)',
};

const navLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const navDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider value={colorScheme === 'dark' ? navDarkTheme : navLightTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen
                name="practice"
                options={{ title: 'Practice Partner', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="reflection" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="day-plan" options={{ title: 'Plan your day', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="streak-detail" options={{ title: 'Streak',headerShown:false }} />
              <Stack.Screen name="resource/[id]" options={{ title: 'Resource' }} />
              <Stack.Screen name="quiz-session/[id]" options={{ title: 'Speed round',headerShown:false }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
