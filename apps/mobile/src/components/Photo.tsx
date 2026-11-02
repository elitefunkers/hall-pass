import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';

interface PhotoProps {
  uri: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  aspectRatio?: number;
  rounded?: number;
}

export function Photo({ uri, accessibilityLabel, style, aspectRatio, rounded = 0 }: PhotoProps) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={[styles.frame, { borderRadius: rounded }, aspectRatio ? { aspectRatio } : null, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {failed ? (
        <View style={styles.fallback}>
          <Feather name="image" size={28} color={colors.inkSubtle} />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.sunken },
  fallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
