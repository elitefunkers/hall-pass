import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { ErrorState } from '@/components/States';
import { errorMessage, useMatch, useMyProfile } from '@/hooks/queries';
import { colors, motion, radius, space } from '@/theme/tokens';

/** The one authored motion moment in the app: two portraits settle together. */
export default function MatchConfirmation() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const match = useMatch(matchId);
  const me = useMyProfile();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!match.data) return;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        progress.setValue(1);
        return;
      }
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.moment,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    });
    AccessibilityInfo.announceForAccessibility(`It’s mutual. You and ${match.data.other.firstName} liked each other.`);
  }, [match.data, progress]);

  const leftX = progress.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });
  const rightX = progress.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  if (match.isError) {
    return (
      <Screen>
        <ErrorState message={errorMessage(match.error)} onRetry={() => match.refetch()} />
      </Screen>
    );
  }

  const other = match.data?.other;
  return (
    <Screen
      background={colors.wine}
      plainFooter
      footer={
        <View style={styles.actions}>
          <Button
            label={other ? `Message ${other.firstName}` : 'Send a message'}
            variant="inverse"
            icon="message-circle"
            disabled={!other}
            onPress={() => router.replace({ pathname: '/chat/[matchId]', params: { matchId } })}
          />
          <Button label="Keep browsing" variant="quietInverse" onPress={() => router.back()} />
        </View>
      }
    >
      <View style={styles.center}>
        <View style={styles.portraits} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {me.data?.photos[0] ? (
            <Animated.View style={[styles.portrait, styles.left, { opacity: progress, transform: [{ translateX: leftX }, { rotate: '-5deg' }] }]}>
              <Photo uri={me.data.photos[0].uri} aspectRatio={4 / 5} rounded={radius.lg} accessibilityLabel="" />
            </Animated.View>
          ) : null}
          {other?.photos[0] ? (
            <Animated.View style={[styles.portrait, styles.right, { opacity: progress, transform: [{ translateX: rightX }, { rotate: '5deg' }] }]}>
              <Photo uri={other.photos[0].uri} aspectRatio={4 / 5} rounded={radius.lg} accessibilityLabel="" />
            </Animated.View>
          ) : null}
        </View>
        <AppText variant="display" color={colors.wineInk} align="center">
          It’s mutual.
        </AppText>
        <AppText color={colors.wineMuted} align="center" style={styles.copy}>
          {other ? `You and ${other.firstName} liked each other. Say something about what caught your eye.` : ' '}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md },
  portraits: { flexDirection: 'row', justifyContent: 'center', marginBottom: space.lg },
  portrait: {
    width: 150,
    borderRadius: radius.lg,
    borderWidth: 4,
    borderColor: colors.wineInk,
    overflow: 'hidden',
  },
  left: { marginRight: -18, zIndex: 1 },
  right: { marginLeft: -18 },
  copy: { maxWidth: 320 },
  actions: { gap: space.xs },
});
