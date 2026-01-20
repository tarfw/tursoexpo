import { initDatabase, syncDatabase } from '@/db/database';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-get-random-values';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setIsReady(true))
      .catch(e => console.error('DB Init Error:', e));

    const syncInterval = setInterval(async () => {
      console.log('--- Auto-Sync Triggered ---');
      await syncDatabase();
    }, 5000);

    return () => clearInterval(syncInterval);
  }, []);

  if (!isReady) {
    return null; // Or a splash screen / loading indicator
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
