import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { samplePhotoUri } from '@/repositories/mock/seed';
import { useSessionStore } from '@/state/session';
import { colors, layout, space } from '@/theme/tokens';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ageConfirmed = useSessionStore((s) => s.ageConfirmed);
  const next = () => router.push(ageConfirmed ? '/sign-in' : '/age');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Photo uri={samplePhotoUri('welcome', 1)} accessibilityLabel="" style={StyleSheet.absoluteFill} />
        <View style={styles.scrim} />
        <View style={styles.fade}>
          {FADE_STEPS.map((opacity) => (
            <View key={opacity} style={[styles.fadeBand, { opacity }]} />
          ))}
        </View>
      </View>

      <View style={[styles.column, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.brand}>
          <AppText variant="hero" color="#FFFFFF" align="center" accessibilityRole="header" style={styles.shadowed}>
            Hall Pass
          </AppText>
          <AppText variant="bodyStrong" color="#FFFFFF" align="center" style={[styles.tagline, styles.shadowed]}>
            Start with what someone says, not just how they look.
          </AppText>
        </View>

        <View style={styles.actions}>
          <AppText variant="caption" color="rgba(255, 255, 255, 0.85)" align="center" style={styles.legal}>
            Like a specific photo or answer, add a note, and let the conversation start from something real.
          </AppText>
          <Button label="Create account" variant="inverse" onPress={next} />
          <Button label="Sign in" variant="quietInverse" onPress={next} accessibilityLabel="I already have an account. Sign in" />
        </View>
      </View>
    </View>
  );
}

// Stacked bands stand in for a gradient so the buttons sit on a darker base without a visible edge.
const FADE_STEPS = Array.from({ length: 16 }, (_, i) => Number((((i + 1) / 16) * 0.5).toFixed(3)));

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.photoScrim },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  fadeBand: { flex: 1, backgroundColor: '#0A0809' },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    justifyContent: 'space-between',
  },
  brand: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  tagline: { maxWidth: 300, fontSize: 17 },
  shadowed: { textShadowColor: 'rgba(0, 0, 0, 0.35)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } },
  actions: { gap: space.xs },
  legal: { marginBottom: space.xs, paddingHorizontal: space.md },
});
