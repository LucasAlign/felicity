import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";
type ToastAction = { label: string; onClick: () => void };

interface ToastInput {
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  // Milliseconds before auto-dismiss. Defaults longer when there's an action
  // so the user has time to hit Undo.
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  variant: ToastVariant;
}

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(
  null,
);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-forest-700 text-cream-50",
  error: "bg-walnut-600 text-cream-50",
  info: "bg-forest-600 text-cream-50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, variant = "success", action, duration }: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, message, variant, action }]);
      const ms = duration ?? (action ? 6000 : 3000);
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed z-[100] bottom-4 inset-x-4 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-card max-w-[calc(100vw-2rem)] ${VARIANT_CLASSES[t.variant]}`}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 font-medium underline underline-offset-2 hover:opacity-80"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
