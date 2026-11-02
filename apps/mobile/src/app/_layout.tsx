import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { Newsreader_400Regular, Newsreader_500Medium, Newsreader_600SemiBold, useFonts } from '@expo-google-fonts/newsreader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/ToastHost';
import { AuthService } from '@/services';
import { useSessionStore } from '@/state/session';
import { colors } from '@/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

function useSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSessionStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const hydrated = useSessionHydrated();
  const signedIn = useSessionStore((s) => s.session !== null);
  const hasProfile = useSessionStore((s) => s.hasProfile);

  // A stored session can outlive the backend's (expired token, deleted account): fall back to sign-in.
  useEffect(() => {
    if (!hydrated || !signedIn) return;
    AuthService.getSession()
      .then((s) => {
        if (!s) useSessionStore.getState().signedOut();
      })
      .catch(() => {});
  }, [hydrated, signedIn]);

  if ((!fontsLoaded && !fontError) || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading Hall Pass" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Screen name="index" />
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !hasProfile}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && hasProfile}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
        <ToastHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
