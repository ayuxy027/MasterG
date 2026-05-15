import React, { useEffect } from "react";
import { Check, X, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
  duration?: number;
}

const STYLES: Record<ToastType, { bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  success: { bg: "bg-green-500", Icon: Check },
  error: { bg: "bg-red-500", Icon: X },
  info: { bg: "bg-blue-500", Icon: Info },
  warning: { bg: "bg-amber-500", Icon: AlertTriangle },
};

const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 3000 }) => {
  useEffect(() => {
    const id = setTimeout(() => onClose(toast.id), duration);
    return () => clearTimeout(id);
  }, [toast.id, duration, onClose]);

  const { bg, Icon } = STYLES[toast.type];

  return (
    <div className={`${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] max-w-md animate-slideIn`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="text-white/80 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => (
  <div className="fixed top-4 right-4 z-[1000] space-y-2 pointer-events-none">
    {toasts.map((toast) => (
      <div key={toast.id} className="pointer-events-auto">
        <Toast toast={toast} onClose={onClose} />
      </div>
    ))}
  </div>
);

export default Toast;
