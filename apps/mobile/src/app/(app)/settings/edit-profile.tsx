import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/Choice';
import { Screen } from '@/components/Screen';
import { ErrorState, ProfileSkeleton } from '@/components/States';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { limits } from '@/config';
import { broadLocationSchema, firstError, firstNameSchema } from '@/domain/schemas';
import { PhotoGrid } from '@/features/profile/PhotoGrid';
import { PromptEditor, promptAnswersValid, type DraftAnswer } from '@/features/profile/PromptEditor';
import { errorMessage, useMyProfile, useProfileMutations, usePromptLibrary } from '@/hooks/queries';
import { toast } from '@/state/toast';
import type { Gender, Orientation } from '@/types/domain';
import { genderLabels, orientationLabels } from '@/utils/format';
import { colors, space } from '@/theme/tokens';

export default function EditProfile() {
  const me = useMyProfile();
  const library = usePromptLibrary();
  const m = useProfileMutations();

  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState<Gender>('woman');
  const [orientation, setOrientation] = useState<Orientation>('prefer_not_to_say');
  const [area, setArea] = useState('');
  const [bio, setBio] = useState('');
  const [answers, setAnswers] = useState<DraftAnswer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!me.data || loaded) return;
    setFirstName(me.data.firstName);
    setGender(me.data.gender);
    setOrientation(me.data.orientation);
    setArea(me.data.broadLocation);
    setBio(me.data.bio ?? '');
    setAnswers(me.data.answers.map((a) => ({ promptId: a.promptId, answer: a.answer })));
    setLoaded(true);
  }, [me.data, loaded]);

  if (me.isPending || !loaded) {
    return <Screen header={<TopBar title="Edit profile" />}>{me.isError ? <ErrorState message={errorMessage(me.error)} onRetry={() => me.refetch()} /> : <ProfileSkeleton />}</Screen>;
  }
  const profile = me.data!;
  const photoBusy = m.addPhoto.isPending || m.removePhoto.isPending || m.reorderPhotos.isPending;
  const errors = { firstName: firstError(firstNameSchema, firstName), area: firstError(broadLocationSchema, area) };

  const save = async () => {
    setShowErrors(true);
    if (errors.firstName || errors.area || !promptAnswersValid(answers)) {
      toast.error('Fix the highlighted fields first.');
      return;
    }
    try {
      await m.updateDetails.mutateAsync({ firstName: firstName.trim(), gender, orientation, broadLocation: area.trim(), bio });
      await m.saveAnswers.mutateAsync(answers.map((a) => ({ promptId: a.promptId, answer: a.answer.trim() })));
      toast.show('Profile saved.', { tone: 'success' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const photoError = (e: unknown) => toast.error(errorMessage(e));

  return (
    <Screen
      scroll
      header={<TopBar title="Edit profile" />}
      footer={<Button label="Save changes" onPress={save} loading={m.updateDetails.isPending || m.saveAnswers.isPending} />}
    >
      <View style={styles.body}>
        <View style={styles.section}>
          <AppText variant="title">Photos</AppText>
          <AppText variant="caption" color={colors.inkMuted}>
            Changes to photos save straight away. New photos are reviewed before others see them.
          </AppText>
          <PhotoGrid
            photos={profile.photos.map((p) => ({ key: p.id, uri: p.uri }))}
            busy={photoBusy}
            onAdd={(uri) => m.addPhoto.mutate(uri, { onError: photoError })}
            onRemove={(index) => {
              if (profile.photos.length <= limits.minPhotos) {
                toast.error(`Keep at least ${limits.minPhotos} photos. Add a new one first.`);
                return;
              }
              m.removePhoto.mutate(profile.photos[index].id, { onError: photoError });
            }}
            onMove={(from, to) => {
              const ids = profile.photos.map((p) => p.id);
              const [moved] = ids.splice(from, 1);
              ids.splice(to, 0, moved);
              m.reorderPhotos.mutate(ids, { onError: photoError });
            }}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="title">Prompts</AppText>
          {library.data ? <PromptEditor library={library.data} answers={answers} onChange={setAnswers} showErrors={showErrors} /> : null}
        </View>

        <View style={styles.section}>
          <AppText variant="title">About you</AppText>
          <TextField label="First name" value={firstName} onChangeText={setFirstName} error={showErrors ? errors.firstName : null} />
          <TextField label="Your area" value={area} onChangeText={setArea} helper="Shown as a broad area only." error={showErrors ? errors.area : null} />
          <TextField
            label="A short bio (optional)"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={limits.bio}
            showCount
          />
          <ChipGroup<Gender>
            label="I’m a"
            options={(Object.keys(genderLabels) as Gender[]).map((g) => ({ value: g, label: genderLabels[g] }))}
            selected={[gender]}
            onToggle={setGender}
          />
          <ChipGroup<Orientation>
            label="Orientation"
            options={(Object.keys(orientationLabels) as Orientation[]).map((o) => ({ value: o, label: orientationLabels[o] }))}
            selected={[orientation]}
            onToggle={setOrientation}
          />
          <AppText variant="caption" color={colors.inkMuted}>
            Date of birth can’t be changed here. Contact support if it’s wrong.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xl, paddingTop: space.xs },
  section: { gap: space.md },
});
