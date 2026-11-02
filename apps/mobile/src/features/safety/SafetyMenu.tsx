import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheet, ConfirmSheet, type SheetAction } from '@/components/Sheet';
import { errorMessage, useSafetyActions } from '@/hooks/queries';
import { toast } from '@/state/toast';

interface SafetyMenuProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  name: string;
  matchId?: string;
  onLeave?: () => void;
}

/** Unmatch, block and report, each with an explicit confirmation step. */
export function SafetyMenu({ visible, onClose, userId, name, matchId, onLeave }: SafetyMenuProps) {
  const router = useRouter();
  const { block, unmatch } = useSafetyActions();
  const [confirm, setConfirm] = useState<'block' | 'unmatch' | null>(null);

  const actions: SheetAction[] = [
    ...(matchId ? [{ label: `Unmatch ${name}`, icon: 'user-x' as const, onPress: () => setConfirm('unmatch') }] : []),
    { label: `Report ${name}`, icon: 'flag', onPress: () => router.push({ pathname: '/report', params: { userId, name } }) },
    { label: `Block ${name}`, icon: 'slash', destructive: true, onPress: () => setConfirm('block') },
  ];

  const done = (message: string) => {
    setConfirm(null);
    toast.show(message, { tone: 'success' });
    onLeave?.();
  };

  return (
    <>
      <ActionSheet visible={visible} title={name} actions={actions} onClose={onClose} />
      <ConfirmSheet
        visible={confirm === 'unmatch'}
        title={`Unmatch ${name}?`}
        body="Your conversation will close for both of you and you won’t be matched again unless you both like each other in future."
        confirmLabel="Unmatch"
        destructive
        loading={unmatch.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          matchId &&
          unmatch.mutate(matchId, { onSuccess: () => done(`You unmatched ${name}.`), onError: (e) => toast.error(errorMessage(e)) })
        }
      />
      <ConfirmSheet
        visible={confirm === 'block'}
        title={`Block ${name}?`}
        body="They won’t see your profile or be able to message you, and any match ends. They aren’t told you blocked them."
        confirmLabel="Block"
        destructive
        loading={block.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => block.mutate(userId, { onSuccess: () => done(`${name} is blocked.`), onError: (e) => toast.error(errorMessage(e)) })}
      />
    </>
  );
}
