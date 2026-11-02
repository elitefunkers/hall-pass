import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import type { IconName } from '@/components/Button';
import { useIncomingLikes } from '@/hooks/queries';
import { colors, fonts } from '@/theme/tokens';

/** Icon-only tabs; the label is still read out by screen readers. */
function TabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={24} color={color} />
      <View style={[styles.dot, focused && styles.dotOn]} />
    </View>
  );
}

export default function TabsLayout() {
  const likes = useIncomingLikes();
  const likeCount = likes.data?.length ?? 0;

  const tab = (label: string, icon: IconName) => ({
    title: label,
    tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <TabIcon name={icon} color={String(color ?? colors.inkSubtle)} focused={focused} />
    ),
    tabBarAccessibilityLabel: label,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, minHeight: 64, paddingTop: 8 },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="discover" options={tab('Discover', 'compass')} />
      <Tabs.Screen
        name="likes"
        options={{
          ...tab('Likes', 'heart'),
          tabBarBadge: likeCount > 0 ? likeCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent, fontFamily: fonts.bodySemibold },
          tabBarAccessibilityLabel: likeCount > 0 ? `Likes, ${likeCount} new` : 'Likes',
        }}
      />
      <Tabs.Screen name="matches" options={tab('Matches', 'message-circle')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'user')} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.accent },
});
