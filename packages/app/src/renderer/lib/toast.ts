import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string | undefined;
  message: string;
  duration?: number | undefined;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (item: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (item) => {
    const id = Math.random().toString(36).slice(2, 9);
    const duration = item.duration ?? (item.type === 'error' ? 5000 : 4000);
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  info: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().add({ type: 'info', message, title, duration }),
  success: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().add({ type: 'success', message, title, duration }),
  warning: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().add({ type: 'warning', message, title, duration }),
  error: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().add({ type: 'error', message, title, duration }),
};
