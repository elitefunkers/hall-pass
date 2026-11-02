import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { limits } from '@/config';
import { toast } from '@/state/toast';
import { colors, radius, space } from '@/theme/tokens';

export interface GridPhoto {
  key: string;
  uri: string;
}

interface PhotoGridProps {
  photos: GridPhoto[];
  onAdd: (uri: string) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  busy?: boolean;
}

export async function pickPhoto(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0].uri;
  } catch {
    toast.error('We couldn’t open your photos. Check Hall Pass has photo access in Settings.');
    return null;
  }
}

export function PhotoGrid({ photos, onAdd, onRemove, onMove, busy }: PhotoGridProps) {
  const slots = Array.from({ length: limits.maxPhotos }, (_, i) => photos[i] ?? null);
  const add = async () => {
    const uri = await pickPhoto();
    if (uri) onAdd(uri);
  };

  return (
    <View style={styles.grid}>
      {slots.map((photo, index) =>
        photo ? (
          <View key={photo.key} style={styles.cell}>
            <Photo uri={photo.uri} aspectRatio={4 / 5} rounded={radius.md} accessibilityLabel={`Your photo ${index + 1}`} />
            <View style={styles.badge}>
              <AppText variant="caption" color={colors.inkInverse}>
                {index === 0 ? '1 · First' : String(index + 1)}
              </AppText>
            </View>
            <View style={styles.controls}>
              <IconButton
                icon="chevron-left"
                accessibilityLabel={`Move photo ${index + 1} earlier`}
                disabled={index === 0 || busy}
                onPress={() => onMove(index, index - 1)}
                tone="surface"
              />
              <IconButton
                icon="trash-2"
                accessibilityLabel={`Remove photo ${index + 1}`}
                disabled={busy}
                onPress={() => onRemove(index)}
                tone="surface"
              />
              <IconButton
                icon="chevron-right"
                accessibilityLabel={`Move photo ${index + 1} later`}
                disabled={index === photos.length - 1 || busy}
                onPress={() => onMove(index, index + 1)}
                tone="surface"
              />
            </View>
          </View>
        ) : (
          <Pressable
            key={`empty-${index}`}
            onPress={add}
            disabled={busy || index !== photos.length}
            accessibilityRole="button"
            accessibilityLabel={`Add photo ${index + 1}`}
            accessibilityState={{ disabled: busy || index !== photos.length }}
            style={({ pressed }) => [
              styles.cell,
              styles.empty,
              index !== photos.length && styles.emptyIdle,
              pressed && { backgroundColor: colors.accentTint },
            ]}
          >
            {busy && index === photos.length ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <View style={[styles.plus, index !== photos.length && styles.plusIdle]}>
                  <Feather name="plus" size={20} color={index === photos.length ? colors.inkInverse : colors.inkSubtle} />
                </View>
                {index === photos.length ? <AppText variant="label">Add photo</AppText> : null}
              </>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: '47.5%', gap: space.xs },
  badge: {
    position: 'absolute',
    top: space.xs,
    left: space.xs,
    backgroundColor: 'rgba(32, 26, 23, 0.72)',
    borderRadius: radius.pill,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  controls: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: {
    aspectRatio: 4 / 5,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  emptyIdle: { opacity: 0.55 },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  plusIdle: { backgroundColor: colors.sunken },
});
