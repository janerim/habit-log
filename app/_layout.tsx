// 루트 레이아웃: DB 초기화, 전역 Provider, 스택 네비.
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../db/database';
import { useHabitStore } from '../store/habitStore';

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadHabits = useHabitStore((s) => s.load);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await loadHabits();
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [loadHabits]);

  const theme = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: 'red' }}>초기화 실패: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="habit-edit"
              options={{ presentation: 'modal', headerShown: true, title: '습관 편집' }}
            />
            <Stack.Screen
              name="group-edit"
              options={{ presentation: 'modal', headerShown: true, title: '그룹 편집' }}
            />
            <Stack.Screen
              name="backup"
              options={{ presentation: 'modal', headerShown: true, title: '백업 / 복원' }}
            />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
