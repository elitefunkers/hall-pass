import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="details" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="prompts" />
      <Stack.Screen name="preview" />
    </Stack>
  );
}
