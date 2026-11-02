import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="person/[id]" />
      <Stack.Screen name="like" options={{ presentation: 'modal' }} />
      <Stack.Screen name="match/[matchId]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="chat/[matchId]" />
      <Stack.Screen name="report" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings/edit-profile" />
      <Stack.Screen name="settings/preferences" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/account" />
    </Stack>
  );
}
