import { useRouter } from 'expo-router';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Photo } from '@/components/Photo';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States';
import { errorMessage, useMatches } from '@/hooks/queries';
import type { Match } from '@/types/domain';
import { relativeTime } from '@/utils/format';
import { colors, layout, radius, space } from '@/theme/tokens';

export default function Matches() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const matches = useMatches();

  // New matches and unanswered messages both need you to act, so they lead.
  const yourTurn = matches.data?.filter((m) => !m.lastMessage || !m.lastMessage.fromMe) ?? [];
  const theirTurn = matches.data?.filter((m) => m.lastMessage?.fromMe) ?? [];
  const sections = [
    { title: `Your turn (${yourTurn.length})`, data: yourTurn },
    { title: `Their turn (${theirTurn.length})`, data: theirTurn },
  ].filter((s) => s.data.length > 0);

  const open = (m: Match) => router.push({ pathname: '/chat/[matchId]', params: { matchId: m.id } });

  const renderRow = ({ item }: { item: Match }) => {
    const isNew = !item.lastMessage;
    const preview = item.lastMessage
      ? `${item.lastMessage.fromMe ? 'You: ' : ''}${item.lastMessage.body}`
      : `Start the chat with ${item.other.firstName}`;
    const theirTurn = item.lastMessage && !item.lastMessage.fromMe;
    return (
      <Pressable
        onPress={() => open(item)}
        accessibilityRole="button"
        accessibilityLabel={
          isNew
            ? `New match: ${item.other.firstName}. Start a conversation.`
            : `${item.other.firstName}. ${preview}${theirTurn ? '. Your turn to reply.' : ''}`
        }
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sunken }]}
      >
        <Photo uri={item.other.photos[0]?.uri ?? ''} aspectRatio={1} rounded={radius.pill} style={styles.avatar} accessibilityLabel="" />
        <View style={styles.flex}>
          <View style={styles.rowTop}>
            <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {item.other.firstName}
            </AppText>
            {isNew ? (
              <View style={styles.newPill}>
                <AppText variant="caption" color={colors.onAccent}>
                  New
                </AppText>
              </View>
            ) : (
              <AppText variant="caption" color={colors.inkSubtle}>
                {relativeTime(item.lastMessage?.createdAt ?? item.createdAt)}
              </AppText>
            )}
          </View>
          <AppText
            variant={theirTurn ? 'bodyStrong' : 'caption'}
            color={theirTurn ? colors.ink : colors.inkMuted}
            numberOfLines={1}
            style={theirTurn ? styles.unread : undefined}
          >
            {preview}
          </AppText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <AppText variant="title">Matches</AppText>
        </View>
      </View>
      {matches.isPending ? (
        <View style={styles.column}>
          <ListSkeleton />
        </View>
      ) : matches.isError ? (
        <View style={[styles.column, styles.flex]}>
          <ErrorState message={errorMessage(matches.error)} onRetry={() => matches.refetch()} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.id}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <AppText variant="label" color={colors.inkMuted} accessibilityRole="header">
                {section.title}
              </AppText>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          refreshing={matches.isRefetching}
          onRefresh={() => matches.refetch()}
          contentContainerStyle={[styles.list, sections.length === 0 && styles.grow]}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="No matches yet"
              body="When you and someone both like each other, you’ll be able to message here."
              actionLabel="Go to Discover"
              onAction={() => router.navigate('/discover')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: layout.gutter },
  header: { minHeight: 56, justifyContent: 'center' },
  list: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: layout.gutter, paddingBottom: space.xl },
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  sectionHead: {
    paddingTop: space.md,
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    marginBottom: space.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    marginHorizontal: -space.xs,
    borderRadius: radius.md,
    minHeight: 76,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  avatar: { width: 56 },
  unread: { fontSize: 14, lineHeight: 20 },
  newPill: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: space.xs, paddingVertical: 1 },
});
