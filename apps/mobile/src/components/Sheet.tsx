import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button, type IconName } from './Button';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <AppText variant="title">{title}</AppText>
          {children}
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ visible, title, body, confirmLabel, destructive, loading, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={onCancel} title={title}>
      <AppText color={colors.inkMuted}>{body}</AppText>
      <View style={styles.actions}>
        <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} />
        <Button label="Cancel" variant="quiet" onPress={onCancel} />
      </View>
    </Sheet>
  );
}

export interface SheetAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
}

export function ActionSheet({ visible, title, actions, onClose }: { visible: boolean; title: string; actions: SheetAction[]; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Button
            key={a.label}
            label={a.label}
            icon={a.icon}
            variant={a.destructive ? 'danger' : 'secondary'}
            onPress={() => {
              onClose();
              // iOS cannot present a new modal while this one is still dismissing.
              setTimeout(a.onPress, Platform.OS === 'ios' ? 350 : 0);
            }}
          />
        ))}
        <Button label="Cancel" variant="quiet" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong },
  actions: { gap: space.xs, marginTop: space.xs },
});
