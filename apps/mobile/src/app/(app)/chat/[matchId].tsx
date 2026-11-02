import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/Button';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/States';
import { limits } from '@/config';
import { SafetyMenu } from '@/features/safety/SafetyMenu';
import { errorMessage, useMatch, useMessages, useSendMessage } from '@/hooks/queries';
import { useSessionStore } from '@/state/session';
import type { Message } from '@/types/domain';
import { clockTime } from '@/utils/format';
import { colors, fonts, layout, radius, space } from '@/theme/tokens';

function newClientId() {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Conversation() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const myId = useSessionStore((s) => s.session?.userId ?? '');
  const match = useMatch(matchId);
  const messages = useMessages(matchId);
  const send = useSendMessage(matchId, myId);
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState(false);

  const other = match.data?.other;
  const ended = match.data && match.data.status !== 'active';
  const ordered = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]);
  const lastMineId = messages.data?.filter((m) => m.senderId === myId).at(-1)?.id;

  const submit = () => {
    const body = draft.trim();
    if (!body || ended) return;
    setDraft('');
    send.mutate({ body, clientId: newClientId() });
  };

  const retry = (m: Message) => m.clientId && send.mutate({ body: m.body, clientId: m.clientId });

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.senderId === myId;
    const showStatus = mine && (item.delivery !== 'sent' || item.id === lastMineId);
    return (
      <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
        <Pressable
          disabled={item.delivery !== 'failed'}
          onPress={() => retry(item)}
          accessibilityRole={item.delivery === 'failed' ? 'button' : undefined}
          accessibilityLabel={`${mine ? 'You' : (other?.firstName ?? 'They')} said: ${item.body}. ${clockTime(item.createdAt)}${
            item.delivery === 'failed' ? '. Not sent. Tap to retry.' : ''
          }`}
          style={[styles.bubble, mine ? styles.mine : styles.theirs, item.delivery === 'failed' && styles.failed]}
        >
          <AppText color={mine ? colors.onAccent : colors.ink}>{item.body}</AppText>
        </Pressable>
        {showStatus ? (
          <View style={styles.status}>
            {item.delivery === 'failed' ? <Feather name="alert-circle" size={13} color={colors.danger} /> : null}
            <AppText variant="caption" color={item.delivery === 'failed' ? colors.danger : colors.inkMuted}>
              {item.delivery === 'sending' ? 'Sending…' : item.delivery === 'failed' ? 'Not sent · Tap to retry' : `Sent ${clockTime(item.createdAt)}`}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  };

  const header = (
    <View style={styles.header}>
      <IconButton icon="chevron-left" accessibilityLabel="Back to matches" onPress={() => router.back()} />
      <Pressable
        style={styles.who}
        disabled={!other}
        onPress={() => other && router.push({ pathname: '/person/[id]', params: { id: other.id, matchId } })}
        accessibilityRole="button"
        accessibilityLabel={other ? `View ${other.firstName}’s profile` : 'Loading'}
      >
        {other?.photos[0] ? <Photo uri={other.photos[0].uri} aspectRatio={1} rounded={radius.pill} style={styles.avatar} accessibilityLabel="" /> : null}
        <AppText variant="heading" numberOfLines={1} style={styles.flex}>
          {other?.firstName ?? ''}
        </AppText>
      </Pressable>
      {other ? <IconButton icon="more-horizontal" accessibilityLabel={`Options for ${other.firstName}`} onPress={() => setMenu(true)} /> : null}
    </View>
  );

  const composer = ended ? (
    <View style={styles.ended}>
      <Feather name="lock" size={16} color={colors.inkMuted} />
      <AppText variant="caption" color={colors.inkMuted}>
        This conversation has ended. You can’t send new messages.
      </AppText>
    </View>
  ) : (
    <View style={styles.composer}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={other ? `Message ${other.firstName}` : 'Message'}
        placeholderTextColor={colors.inkSubtle}
        selectionColor={colors.accent}
        multiline
        maxLength={limits.message}
        accessibilityLabel="Message"
        style={styles.input}
      />
      <Pressable
        onPress={submit}
        disabled={!draft.trim()}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !draft.trim() }}
        style={({ pressed }) => [styles.send, !draft.trim() && styles.sendOff, pressed && { backgroundColor: colors.accentPressed }]}
      >
        <Feather name="arrow-up" size={22} color={colors.onAccent} />
      </Pressable>
    </View>
  );

  let body;
  if (match.isError || messages.isError) {
    body = <ErrorState message={errorMessage(match.error ?? messages.error)} onRetry={() => { match.refetch(); messages.refetch(); }} />;
  } else if (messages.isPending || match.isPending) {
    body = <ListSkeleton rows={3} />;
  } else {
    body = (
      <FlatList
        inverted
        data={ordered}
        keyExtractor={(m) => m.clientId ?? m.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, ordered.length === 0 && styles.grow]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.flip}>
            <EmptyState
              icon="feather"
              title={`You matched with ${other?.firstName ?? 'them'}`}
              body="Mention something from their profile — it’s the easiest way to start."
            />
          </View>
        }
      />
    );
  }

  return (
    <Screen header={header} footer={composer} contentStyle={styles.flex}>
      {body}
      {other ? (
        <SafetyMenu visible={menu} onClose={() => setMenu(false)} userId={other.id} name={other.firstName} matchId={matchId} onLeave={() => router.dismissTo('/matches')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  flip: { flex: 1, transform: [{ scaleY: -1 }] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginHorizontal: -space.sm,
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch },
  avatar: { width: 36 },
  list: { paddingVertical: space.md, gap: space.xs },
  bubbleRow: { maxWidth: '82%', gap: 2 },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: space.md, paddingVertical: 10, borderRadius: radius.lg },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.sunken, borderBottomLeftRadius: 6 },
  failed: { opacity: 0.7, borderWidth: 1.5, borderColor: colors.danger },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.xxs },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs },
  input: {
    flex: 1,
    minHeight: layout.minTouch,
    maxHeight: 140,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  send: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: colors.lineStrong },
  ended: { flexDirection: 'row', alignItems: 'center', gap: space.xs, justifyContent: 'center', minHeight: layout.minTouch },
});
