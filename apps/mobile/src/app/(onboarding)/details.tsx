import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/components/Choice';
import { Screen } from '@/components/Screen';
import { StepFooter, StepHeader } from '@/components/Step';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { broadLocationSchema, dateOfBirthSchema, firstError, firstNameSchema } from '@/domain/schemas';
import { ONBOARDING_STEPS } from '@/features/onboarding/steps';
import { AuthService } from '@/services';
import { useSessionStore } from '@/state/session';
import type { Gender, Orientation } from '@/types/domain';
import { genderLabels, orientationLabels } from '@/utils/format';
import { getCoarseDeviceLocation } from '@/utils/location';
import { colors, radius, space } from '@/theme/tokens';

function splitDob(iso: string) {
  const [y = '', m = '', d = ''] = iso ? iso.split('-') : [];
  return { y, m, d };
}

export default function Details() {
  const router = useRouter();
  const draft = useSessionStore((s) => s.draft);
  const updateDraft = useSessionStore((s) => s.updateDraft);
  const signedOut = useSessionStore((s) => s.signedOut);

  const initial = splitDob(draft.dateOfBirth);
  const [firstName, setFirstName] = useState(draft.firstName);
  const [day, setDay] = useState(initial.d);
  const [month, setMonth] = useState(initial.m);
  const [year, setYear] = useState(initial.y);
  const [gender, setGender] = useState<Gender | null>(draft.gender);
  const [orientation, setOrientation] = useState<Orientation | null>(draft.orientation);
  const [area, setArea] = useState(draft.broadLocation);
  const [coarseLocation, setCoarseLocation] = useState(draft.coarseLocation);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const useMyLocation = async () => {
    setLocating(true);
    setLocationNote(null);
    const result = await getCoarseDeviceLocation();
    setLocating(false);
    if (!result.ok) {
      setLocationNote(result.message);
      return;
    }
    setCoarseLocation(result.location);
    if (result.areaLabel) setArea(result.areaLabel);
    setLocationNote('Location added. Only an approximate distance is ever shown.');
  };
  const monthRef = useRef<TextInputInstance>(null);
  const yearRef = useRef<TextInputInstance>(null);

  const dob = day && month && year.length === 4 ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
  const errors = {
    firstName: firstError(firstNameSchema, firstName),
    dob: dob ? firstError(dateOfBirthSchema, dob) : 'Enter your full date of birth.',
    gender: gender ? null : 'Choose the option that fits best.',
    orientation: orientation ? null : 'Choose one, or “Prefer not to say”.',
    area: firstError(broadLocationSchema, area),
  };
  const valid = Object.values(errors).every((e) => e === null);

  const next = () => {
    setShowErrors(true);
    if (!valid) return;
    updateDraft({ firstName: firstName.trim(), dateOfBirth: dob, gender, orientation, broadLocation: area.trim(), coarseLocation });
    router.push('/preferences');
  };

  const show = (e: string | null) => (showErrors ? e : null);

  return (
    <Screen
      scroll
      header={
        <TopBar
          step={{ current: 1, total: ONBOARDING_STEPS }}
          backLabel="Sign out"
          onBack={async () => {
            await AuthService.signOut();
            signedOut();
          }}
        />
      }
      plainFooter
      footer={<StepFooter label="Continue" onNext={next} />}
    >
      <View style={styles.body}>
        <StepHeader
          title="Let’s start with the basics"
          body="Your first name, age and broad area show on your profile. Your full birthday never does."
        />

        <TextField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
          error={show(errors.firstName)}
        />

        <View style={styles.group}>
          <AppText variant="label">Date of birth</AppText>
          <View style={styles.dobRow}>
            <View style={styles.dobDay}>
              <TextField
                label="Day"
                value={day}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 2);
                  setDay(v);
                  if (v.length === 2) monthRef.current?.focus();
                }}
                keyboardType="number-pad"
                placeholder="DD"
                maxLength={2}
              />
            </View>
            <View style={styles.dobDay}>
              <TextField
                ref={monthRef}
                label="Month"
                value={month}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 2);
                  setMonth(v);
                  if (v.length === 2) yearRef.current?.focus();
                }}
                keyboardType="number-pad"
                placeholder="MM"
                maxLength={2}
              />
            </View>
            <View style={styles.dobYear}>
              <TextField
                ref={yearRef}
                label="Year"
                value={year}
                onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder="YYYY"
                maxLength={4}
              />
            </View>
          </View>
          {show(errors.dob) ? (
            <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
              {errors.dob}
            </AppText>
          ) : null}
        </View>

        <ChipGroup<Gender>
          label="Which gender best describes you?"
          layout="list"
          options={(Object.keys(genderLabels) as Gender[]).map((g) => ({ value: g, label: genderLabels[g] }))}
          selected={gender ? [gender] : []}
          onToggle={setGender}
          error={show(errors.gender)}
        />

        <ChipGroup<Orientation>
          label="Orientation"
          options={(Object.keys(orientationLabels) as Orientation[]).map((o) => ({ value: o, label: orientationLabels[o] }))}
          selected={orientation ? [orientation] : []}
          onToggle={setOrientation}
          error={show(errors.orientation)}
        />

        <TextField
          label="Your area"
          value={area}
          onChangeText={setArea}
          placeholder="Neighbourhood or city"
          helper="Shown as a broad area only. You can use Hall Pass without sharing your device location."
          autoCapitalize="words"
          error={show(errors.area)}
        />

        <View style={styles.locationBox}>
          <AppText variant="caption" color={colors.inkMuted}>
            Optional: use your phone’s location to show rough distances like “About 5 km away”. It’s rounded to about 5 km
            before it leaves your phone and is never shown exactly.
          </AppText>
          <Button
            label={coarseLocation ? 'Location added · Update' : 'Use my current location'}
            icon="map-pin"
            variant="secondary"
            compact
            loading={locating}
            onPress={useMyLocation}
          />
          {coarseLocation ? (
            <Button label="Don’t use my location" variant="quiet" compact onPress={() => { setCoarseLocation(null); setLocationNote(null); }} />
          ) : null}
          {locationNote ? (
            <AppText variant="caption" color={colors.inkMuted} accessibilityLiveRegion="polite">
              {locationNote}
            </AppText>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  group: { gap: space.xs },
  dobRow: { flexDirection: 'row', gap: space.sm },
  dobDay: { flex: 1 },
  dobYear: { flex: 1.4 },
  locationBox: { gap: space.xs, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
});
