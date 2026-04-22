/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  ToastViewport,
  type ToastItem,
  type ToastType,
} from '../components/ToastViewport';

type ToastPayload = {
  message: string;
  title?: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 3800;

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIds = useRef<number[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      message,
      title,
      type = 'info',
      durationMs = DEFAULT_DURATION_MS,
    }: ToastPayload) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((previous) => [...previous, { id, message, title, type }]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
      timeoutIds.current.push(timeoutId);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIds.current = [];
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }

  return context;
}
