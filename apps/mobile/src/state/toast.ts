import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'neutral' | 'error' | 'success';
  action?: ToastAction;
  durationMs: number;
}

interface ToastState {
  current: Toast | null;
  show: (message: string, options?: { tone?: Toast['tone']; action?: ToastAction; durationMs?: number }) => void;
  dismiss: (id?: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  current: null,
  show: (message, options) => {
    counter += 1;
    set({
      current: {
        id: counter,
        message,
        tone: options?.tone ?? 'neutral',
        action: options?.action,
        durationMs: options?.durationMs ?? (options?.action ? 6000 : 3500),
      },
    });
  },
  dismiss: (id) => {
    if (id === undefined || get().current?.id === id) set({ current: null });
  },
}));

export const toast = {
  show: (...args: Parameters<ToastState['show']>) => useToastStore.getState().show(...args),
  error: (message: string) => useToastStore.getState().show(message, { tone: 'error' }),
};
