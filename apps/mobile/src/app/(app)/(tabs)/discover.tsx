import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button, CircleButton, IconButton } from '@/components/Button';
import { ActionSheet, ConfirmSheet } from '@/components/Sheet';
import { EmptyState, ErrorState, ProfileSkeleton } from '@/components/States';
import { ProfileView } from '@/features/profile/ProfileView';
import { errorMessage, useDiscoverFeed, useMyProfile, usePassProfile, useSafetyActions, useUndoPass } from '@/hooks/queries';
import { toast } from '@/state/toast';
import type { PublicProfile } from '@/types/domain';
import { colors, fonts, layout, motion, radius, space } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const feed = useDiscoverFeed();
  const me = useMyProfile();
  const pass = usePassProfile();
  const undo = useUndoPass();
  const { block } = useSafetyActions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const profiles = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const current: PublicProfile | undefined = profiles[0];

  useEffect(() => {
    if (profiles.length < 2 && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [profiles.length, feed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: motion.standard, useNativeDriver: true }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [current?.id, fade]);

  const doPass = () => {
    if (!current) return;
    const person = current;
    pass.mutate(person.id, {
      onSuccess: () =>
        toast.show(`You passed on ${person.firstName}.`, {
          action: { label: 'Undo', onPress: () => undo.mutate(person.id) },
        }),
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  let body;
  if (feed.isPending) {
    body = <ProfileSkeleton />;
  } else if (feed.isError) {
    body = <ErrorState message={errorMessage(feed.error)} onRetry={() => feed.refetch()} />;
  } else if (!current) {
    body = (
      <EmptyState
        icon="sun"
        title="You’re all caught up"
        body="New people join every day. Widening your age range or distance can show you more profiles now."
        actionLabel="Adjust preferences"
        onAction={() => router.push('/settings/preferences')}
      />
    );
  } else {
    body = (
      <Animated.View style={{ opacity: fade }}>
        <ProfileView
          profile={current}
          onLike={(target) =>
            router.push({
              pathname: '/like',
              params: { userId: current.id, type: target.type, itemId: target.itemId ?? '' },
            })
          }
          footer={
            <View style={styles.endRow}>
              <Button
                label={`Like ${current.firstName}`}
                icon="heart"
                accessibilityLabel={`Like ${current.firstName}’s whole profile`}
                onPress={() => router.push({ pathname: '/like', params: { userId: current.id, type: 'profile', itemId: '' } })}
              />
            </View>
          }
        />
      </Animated.View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton icon="sliders" accessibilityLabel="Dating preferences" onPress={() => router.push('/settings/preferences')} />
          <AppText variant="heading" style={styles.brand} accessibilityRole="header" accessibilityLabel="Discover">
            Hall Pass
          </AppText>
          {current ? (
            <IconButton icon="more-horizontal" accessibilityLabel={`More options for ${current.firstName}`} onPress={() => setMenuOpen(true)} />
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
        {me.data && !me.data.isActive ? (
          <Pressable onPress={() => router.push('/settings/privacy')} accessibilityRole="button" style={styles.paused}>
            <Feather name="pause-circle" size={18} color={colors.inkMuted} />
            <AppText variant="caption" color={colors.inkMuted} style={styles.flex}>
              Your profile is paused, so new people can’t see you. Tap to change.
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <View style={styles.column}>{body}</View>
      </ScrollView>

      {current ? (
        <View style={styles.passWrap} pointerEvents="box-none">
          <View style={styles.column} pointerEvents="box-none">
            <CircleButton
              icon="x"
              size="lg"
              raised
              onPress={doPass}
              disabled={pass.isPending}
              accessibilityLabel={`Pass on ${current.firstName}`}
              accessibilityHint="Shows the next profile. You can undo for a few seconds."
            />
          </View>
        </View>
      ) : null}

      {current ? (
        <>
          <ActionSheet
            visible={menuOpen}
            title={current.firstName}
            onClose={() => setMenuOpen(false)}
            actions={[
              { label: `Report ${current.firstName}`, icon: 'flag', onPress: () => router.push({ pathname: '/report', params: { userId: current.id, name: current.firstName } }) },
              { label: `Block ${current.firstName}`, icon: 'slash', destructive: true, onPress: () => setConfirmBlock(true) },
            ]}
          />
          <ConfirmSheet
            visible={confirmBlock}
            title={`Block ${current.firstName}?`}
            body="They won’t see your profile or be able to contact you, and you won’t see them. They aren’t told you blocked them."
            confirmLabel="Block"
            destructive
            loading={block.isPending}
            onCancel={() => setConfirmBlock(false)}
            onConfirm={() =>
              block.mutate(current.id, {
                onSuccess: () => {
                  setConfirmBlock(false);
                  toast.show(`${current.firstName} is blocked.`, { tone: 'success' });
                },
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: layout.gutter },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, marginHorizontal: -space.sm },
  brand: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3 },
  headerSpacer: { width: layout.minTouch },
  paused: {
    flexDirection: 'row',
    gap: space.xs,
    alignItems: 'center',
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
    marginBottom: space.xs,
  },
  flex: { flex: 1 },
  scroll: { paddingBottom: 120 },
  endRow: { alignItems: 'center', paddingVertical: space.lg },
  passWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.md,
  },
});
