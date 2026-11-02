import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { limits } from '@/config';
import { firstError, promptAnswerSchema } from '@/domain/schemas';
import type { Prompt } from '@/types/domain';
import { colors, layout, radius, space } from '@/theme/tokens';

export interface DraftAnswer {
  promptId: string;
  answer: string;
}

interface PromptEditorProps {
  library: Prompt[];
  answers: DraftAnswer[];
  onChange: (answers: DraftAnswer[]) => void;
  showErrors?: boolean;
}

export function promptAnswersValid(answers: DraftAnswer[]): boolean {
  return answers.length >= limits.minPrompts && answers.every((a) => promptAnswerSchema.safeParse(a.answer).success);
}

export function PromptEditor({ library, answers, onChange, showErrors }: PromptEditorProps) {
  const [picking, setPicking] = useState<{ replaceIndex: number | null } | null>(null);
  const used = new Set(answers.map((a) => a.promptId));
  const textFor = (id: string) => library.find((p) => p.id === id)?.text ?? 'Prompt';

  const choose = (promptId: string) => {
    if (!picking) return;
    if (picking.replaceIndex === null) {
      onChange([...answers, { promptId, answer: '' }]);
    } else {
      onChange(answers.map((a, i) => (i === picking.replaceIndex ? { promptId, answer: a.answer } : a)));
    }
    setPicking(null);
  };

  return (
    <View style={styles.stack}>
      {answers.map((a, index) => (
        <View key={a.promptId} style={styles.card}>
          <View style={styles.cardHead}>
            <AppText variant="answer" style={styles.flex}>
              {textFor(a.promptId)}
            </AppText>
          </View>
          <TextField
            label={`Your answer ${index + 1}`}
            value={a.answer}
            onChangeText={(t) => onChange(answers.map((x, i) => (i === index ? { ...x, answer: t } : x)))}
            multiline
            maxLength={limits.promptAnswer}
            showCount
            placeholder="Be specific — details start conversations."
            error={showErrors ? firstError(promptAnswerSchema, a.answer) : null}
          />
          <View style={styles.row}>
            <Button label="Change prompt" variant="quiet" compact icon="refresh-cw" onPress={() => setPicking({ replaceIndex: index })} />
            <Button
              label="Remove"
              variant="quiet"
              compact
              icon="x"
              onPress={() => onChange(answers.filter((_, i) => i !== index))}
              accessibilityLabel={`Remove prompt ${textFor(a.promptId)}`}
            />
          </View>
        </View>
      ))}

      {answers.length < limits.maxPrompts ? (
        <Button
          label={`Choose prompt ${answers.length + 1} of ${limits.maxPrompts}`}
          variant="secondary"
          icon="plus"
          onPress={() => setPicking({ replaceIndex: null })}
        />
      ) : null}

      {showErrors && answers.length < limits.minPrompts ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          Answer {limits.minPrompts} prompts so people have something to respond to.
        </AppText>
      ) : null}

      <Sheet visible={picking !== null} onClose={() => setPicking(null)} title="Choose a prompt">
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {library
            .filter((p) => !used.has(p.id))
            .map((p) => (
              <Pressable
                key={p.id}
                onPress={() => choose(p.id)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.sunken }]}
              >
                <AppText variant="bodyStrong">{p.text}</AppText>
              </Pressable>
            ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  flex: { flex: 1 },
  list: { maxHeight: 420 },
  listContent: { gap: space.xxs, paddingBottom: space.sm },
  option: {
    minHeight: layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
