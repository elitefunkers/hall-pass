import Feather from '@expo/vector-icons/Feather';
import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { CircleButton, type IconName } from '@/components/Button';
import { Photo } from '@/components/Photo';
import type { LikeTarget, ProfilePhoto, PromptAnswer, PublicProfile } from '@/types/domain';
import { genderLabels } from '@/utils/format';
import { colors, radius, space } from '@/theme/tokens';

interface ProfileViewProps {
  profile: PublicProfile;
  onLike?: (target: LikeTarget) => void;
  footer?: ReactNode;
}

type Block = { kind: 'photo'; photo: ProfilePhoto; index: number } | { kind: 'prompt'; answer: PromptAnswer } | { kind: 'vitals' };

/** Photo, prompt, photo, photo, prompt… so personality shows up as early as looks. */
function interleave(photos: ProfilePhoto[], answers: PromptAnswer[]): Block[] {
  const pattern: ('photo' | 'prompt')[] = ['photo', 'prompt', 'photo', 'photo', 'prompt', 'photo', 'prompt', 'photo', 'photo'];
  const blocks: Block[] = [];
  let p = 0;
  let a = 0;
  for (const slot of pattern) {
    if (slot === 'photo' && p < photos.length) blocks.push({ kind: 'photo', photo: photos[p], index: p++ });
    if (slot === 'prompt' && a < answers.length) blocks.push({ kind: 'prompt', answer: answers[a++] });
  }
  while (p < photos.length) blocks.push({ kind: 'photo', photo: photos[p], index: p++ });
  while (a < answers.length) blocks.push({ kind: 'prompt', answer: answers[a++] });
  // The basics sit after the opening photo and answer, once there's a reason to care.
  blocks.splice(Math.min(2, blocks.length), 0, { kind: 'vitals' });
  return blocks;
}

function blockKey(block: Block): string {
  if (block.kind === 'photo') return block.photo.id;
  if (block.kind === 'prompt') return block.answer.id;
  return 'vitals';
}

export function ProfileView({ profile, onLike, footer }: ProfileViewProps) {
  const blocks = interleave(profile.photos, profile.answers);
  const vitals: { icon: IconName; label: string }[] = [
    { icon: 'gift', label: profile.age > 0 ? String(profile.age) : '' },
    { icon: 'user', label: genderLabels[profile.gender] },
    { icon: 'home', label: profile.broadLocation },
    { icon: 'map-pin', label: profile.distanceLabel ?? '' },
  ].filter((v): v is { icon: IconName; label: string } => !!v.label);

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <AppText variant="display">{profile.firstName}</AppText>
      </View>

      {blocks.map((block) => (
        <Fragment key={blockKey(block)}>
          {block.kind === 'photo' ? (
            <View>
              <Photo
                uri={block.photo.uri}
                aspectRatio={4 / 5}
                rounded={radius.md}
                accessibilityLabel={`${profile.firstName}’s photo ${block.index + 1} of ${profile.photos.length}`}
              />
              {onLike ? (
                <HeartButton
                  label={`Like ${profile.firstName}’s photo ${block.index + 1}`}
                  onPress={() => onLike({ type: 'photo', itemId: block.photo.id })}
                  style={styles.heartOnPhoto}
                />
              ) : null}
            </View>
          ) : block.kind === 'prompt' ? (
            <View style={styles.card}>
              <AppText variant="label" color={colors.inkMuted}>
                {block.answer.promptText}
              </AppText>
              <AppText variant="answer">{block.answer.answer}</AppText>
              {onLike ? (
                <HeartButton
                  label={`Like ${profile.firstName}’s answer to “${block.answer.promptText}”`}
                  onPress={() => onLike({ type: 'prompt', itemId: block.answer.id })}
                  style={styles.heartInCard}
                />
              ) : null}
            </View>
          ) : vitals.length > 0 ? (
            <View style={styles.vitalsCard} accessible accessibilityLabel={vitals.map((v) => v.label).join(', ')}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitals}>
                {vitals.map((v, i) => (
                  <View key={v.icon} style={[styles.vital, i > 0 && styles.vitalDivider]}>
                    <Feather name={v.icon} size={16} color={colors.ink} />
                    <AppText variant="label" numberOfLines={1}>
                      {v.label}
                    </AppText>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </Fragment>
      ))}

      {profile.bio ? (
        <View style={styles.card}>
          <AppText variant="label" color={colors.inkMuted}>
            In their words
          </AppText>
          <AppText>{profile.bio}</AppText>
        </View>
      ) : null}

      {footer}
    </View>
  );
}

function HeartButton({ label, onPress, style }: { label: string; onPress: () => void; style: StyleProp<ViewStyle> }) {
  return (
    <CircleButton
      icon="heart"
      iconColor={colors.accent}
      raised
      accessibilityLabel={label}
      accessibilityHint="Opens a note you can send with your like"
      onPress={onPress}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.sm },
  header: { paddingTop: space.xs, paddingBottom: space.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  heartOnPhoto: { position: 'absolute', right: space.sm, bottom: space.sm },
  heartInCard: { alignSelf: 'flex-end', marginTop: space.xs, marginBottom: -space.md },
  vitalsCard: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  vitals: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, paddingVertical: space.md },
  vital: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.sm },
  vitalDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
});
