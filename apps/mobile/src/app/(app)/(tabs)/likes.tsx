import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Photo } from '@/components/Photo';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States';
import { errorMessage, useIncomingLikes } from '@/hooks/queries';
import type { IncomingLike } from '@/types/domain';
import { relativeTime } from '@/utils/format';
import { colors, layout, radius, space } from '@/theme/tokens';

function likedWhat(like: IncomingLike): string {
  if (like.preview.kind === 'photo') return 'Liked your photo';
  if (like.preview.kind === 'prompt') return 'Liked your answer';
  return 'Liked your profile';
}

/** Their note if they wrote one, otherwise the answer of yours they liked. */
function snippet(like: IncomingLike): string | null {
  if (like.comment) return `“${like.comment}”`;
  if (like.preview.kind === 'prompt') return like.preview.answer;
  return null;
}

export default function Likes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const likes = useIncomingLikes();
  const count = likes.data?.length ?? 0;

  const renderItem = ({ item }: { item: IncomingLike }) => {
    const text = snippet(item);
    return (
      <View style={styles.cell}>
        <Pressable
          onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.from.id, likeId: item.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${item.from.firstName}, ${item.from.age}. ${likedWhat(item)}${item.comment ? `: ${item.comment}` : ''}. Open profile to match or pass.`}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.chip}>
            <Feather name={item.comment ? 'message-square' : 'heart'} size={12} color={colors.accent} />
            <AppText variant="caption" numberOfLines={1} style={styles.chipText}>
              {likedWhat(item)}
            </AppText>
          </View>
          <View style={styles.nameRow}>
            <AppText variant="heading" numberOfLines={1} style={styles.flex}>
              {item.from.firstName}
            </AppText>
            <AppText variant="caption" color={colors.inkSubtle}>
              {relativeTime(item.createdAt)}
            </AppText>
          </View>
          <Photo uri={item.from.photos[0]?.uri ?? ''} aspectRatio={4 / 5} rounded={radius.sm} accessibilityLabel="" />
          {text ? (
            <AppText variant="caption" color={colors.inkMuted} numberOfLines={2}>
              {text}
            </AppText>
          ) : null}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <AppText variant="title">Likes you</AppText>
          {count > 0 ? (
            <AppText variant="caption" color={colors.inkMuted}>
              {count === 1 ? '1 person likes you.' : `${count} people like you.`} Open a profile to match or pass.
            </AppText>
          ) : null}
        </View>
      </View>
      {likes.isPending ? (
        <View style={styles.column}>
          <ListSkeleton rows={3} />
        </View>
      ) : likes.isError ? (
        <View style={[styles.column, styles.flex]}>
          <ErrorState message={errorMessage(likes.error)} onRetry={() => likes.refetch()} />
        </View>
      ) : (
        <FlatList
          data={likes.data}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={[styles.list, likes.data.length === 0 && styles.flexGrow]}
          refreshing={likes.isRefetching}
          onRefresh={() => likes.refetch()}
          ListEmptyComponent={
            <EmptyState icon="heart" title="No likes yet" body="When someone likes your photo or answer, they’ll show up here with anything they wrote." />
          }
        />
      )}
    </View>
  );
}

const CELL_GAP = space.xs;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: layout.gutter },
  header: { minHeight: 56, justifyContent: 'center', gap: 2, paddingTop: space.sm, paddingBottom: space.sm },
  list: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter - CELL_GAP / 2,
    paddingBottom: space.xl,
  },
  flexGrow: { flexGrow: 1 },
  flex: { flex: 1 },
  cell: { width: '50%', padding: CELL_GAP / 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs, gap: space.xs },
  cardPressed: { opacity: 0.85 },
  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentTint,
    borderRadius: radius.pill,
    paddingHorizontal: space.xs,
    paddingVertical: 3,
  },
  chipText: { flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xxs, paddingHorizontal: 2 },
});
