export type ToastType = 'success' | 'error' | 'info';

export type ToastItem = {
  id: number;
  title?: string;
  message: string;
  type: ToastType;
};

type ToastViewportProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <aside className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <section
          className={`toast toast-${toast.type}`}
          key={toast.id}
          role="status"
        >
          <div className="toast-body">
            {toast.title ? <h3>{toast.title}</h3> : null}
            <p>{toast.message}</p>
          </div>

          <button
            type="button"
            className="toast-dismiss"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            x
          </button>
        </section>
      ))}
    </aside>
  );
}
