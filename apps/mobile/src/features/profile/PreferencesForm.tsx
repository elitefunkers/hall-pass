import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { ChipGroup, Stepper } from '@/components/Choice';
import { limits } from '@/config';
import type { Gender, Preferences } from '@/types/domain';
import { interestedInLabels } from '@/utils/format';
import { colors, radius, space } from '@/theme/tokens';

interface PreferencesFormProps {
  value: Preferences;
  onChange: (value: Preferences) => void;
  showErrors?: boolean;
}

export function PreferencesForm({ value, onChange, showErrors }: PreferencesFormProps) {
  const toggle = (g: Gender) =>
    onChange({
      ...value,
      interestedIn: value.interestedIn.includes(g) ? value.interestedIn.filter((x) => x !== g) : [...value.interestedIn, g],
    });

  return (
    <View style={styles.stack}>
      <ChipGroup<Gender>
        label="I’m interested in"
        multiple
        options={(Object.keys(interestedInLabels) as Gender[]).map((g) => ({ value: g, label: interestedInLabels[g] }))}
        selected={value.interestedIn}
        onToggle={toggle}
        error={showErrors && value.interestedIn.length === 0 ? 'Choose at least one.' : null}
      />

      <View style={styles.panel}>
        <AppText variant="label" color={colors.inkMuted}>
          Age range: {value.minAge}–{value.maxAge}
        </AppText>
        <Stepper
          label="Youngest"
          value={value.minAge}
          min={limits.minAge}
          max={value.maxAge}
          onChange={(minAge) => onChange({ ...value, minAge })}
        />
        <Stepper
          label="Oldest"
          value={value.maxAge}
          min={value.minAge}
          max={limits.maxAge}
          onChange={(maxAge) => onChange({ ...value, maxAge })}
        />
      </View>

      <View style={styles.panel}>
        <AppText variant="label" color={colors.inkMuted}>
          Distance
        </AppText>
        <ChipGroup<'any' | 'limit'>
          label="How far"
          options={[
            { value: 'any', label: 'Anywhere nearby' },
            { value: 'limit', label: 'Set a limit' },
          ]}
          selected={[value.maxDistanceKm == null ? 'any' : 'limit']}
          onToggle={(v) => onChange({ ...value, maxDistanceKm: v === 'any' ? null : (value.maxDistanceKm ?? 10) })}
        />
        {value.maxDistanceKm != null ? (
          <Stepper
            label="Up to"
            suffix="km"
            value={value.maxDistanceKm}
            min={1}
            max={300}
            onChange={(km) => onChange({ ...value, maxDistanceKm: km })}
          />
        ) : null}
        <AppText variant="caption" color={colors.inkMuted}>
          Distances are approximate and based on the broad area people choose.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  panel: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
