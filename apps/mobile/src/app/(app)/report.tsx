import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { limits } from '@/config';
import { errorMessage, useSafetyActions } from '@/hooks/queries';
import type { ReportReason } from '@/types/domain';
import { reportReasonLabels } from '@/utils/format';
import { colors, layout, radius, space } from '@/theme/tokens';

export default function Report() {
  const router = useRouter();
  const { userId, name, messageId } = useLocalSearchParams<{ userId: string; name: string; messageId?: string }>();
  const { report } = useSafetyActions();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  if (report.isSuccess) {
    return (
      <Screen footer={<Button label="Done" onPress={() => router.dismissTo(alsoBlock ? '/discover' : '/matches')} />}>
        <View style={styles.done}>
          <View style={styles.badge}>
            <Feather name="shield" size={28} color={colors.success} />
          </View>
          <AppText variant="display" align="center">
            Thanks for telling us
          </AppText>
          <AppText color={colors.inkMuted} align="center">
            Our team will review this report. {alsoBlock ? `${name} can no longer see you or contact you. ` : ''}If you’re in danger,
            contact local emergency services.
          </AppText>
        </View>
      </Screen>
    );
  }

  const submit = () => {
    setShowErrors(true);
    if (!reason) return;
    report.mutate({ reportedUserId: userId, messageId: messageId || undefined, reason, details: details.trim() || undefined, alsoBlock });
  };

  return (
    <Screen
      scroll
      header={<TopBar title={`Report ${name}`} backLabel="Cancel" />}
      footer={<Button label="Send report" onPress={submit} loading={report.isPending} />}
    >
      <View style={styles.body}>
        <AppText color={colors.inkMuted}>Reports are confidential. {name} won’t be told who reported them.</AppText>

        <View accessibilityRole="radiogroup" accessibilityLabel="Reason" style={styles.reasons}>
          {(Object.keys(reportReasonLabels) as ReportReason[]).map((r) => {
            const on = reason === r;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${reportReasonLabels[r].title}. ${reportReasonLabels[r].hint}`}
                style={[styles.reason, on && styles.reasonOn]}
              >
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{reportReasonLabels[r].title}</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>
                    {reportReasonLabels[r].hint}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
        {showErrors && !reason ? (
          <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
            Choose a reason so we can route this to the right team.
          </AppText>
        ) : null}

        <TextField
          label="Anything else we should know? (optional)"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={limits.reportDetails}
          showCount
        />

        <Pressable
          onPress={() => setAlsoBlock((b) => !b)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: alsoBlock }}
          style={styles.blockRow}
        >
          <View style={[styles.box, alsoBlock && styles.boxOn]}>{alsoBlock ? <Feather name="check" size={16} color={colors.inkInverse} /> : null}</View>
          <AppText variant="bodyStrong" style={styles.flex}>
            Also block {name}
          </AppText>
        </Pressable>

        {report.isError ? (
          <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
            {errorMessage(report.error)}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingTop: space.xs },
  reasons: { gap: space.xs },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    minHeight: layout.minTouch + 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  reasonOn: { borderColor: colors.ink },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.ink },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  flex: { flex: 1 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch },
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ink },
  done: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center' },
});
