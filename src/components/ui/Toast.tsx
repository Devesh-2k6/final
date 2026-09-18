"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ToastMethods {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  toast: ToastMethods;
}

interface ToastContextType {
  toast: ToastMethods;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods: any = {
    success: (title: string, message?: string) => push("success", title, message),
    error: (title: string, message?: string) => push("error", title, message),
    warning: (title: string, message?: string) => push("warning", title, message),
    info: (title: string, message?: string) => push("info", title, message),
  };
  toastMethods.toast = toastMethods;

  return (
    <ToastContext.Provider value={{ toast: toastMethods as ToastMethods }}>
      {children}
      {/* Toast Viewport */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none w-[360px] max-w-[calc(100vw-2rem)]">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={remove} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Toast Item
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: React.FC<{ size?: number; className?: string }>; border: string; bg: string; iconClass: string; bar: string }> = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-200/70 dark:border-emerald-500/30",
    bg: "bg-white dark:bg-gray-900",
    iconClass: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  error: {
    icon: XCircle,
    border: "border-red-200/70 dark:border-red-500/30",
    bg: "bg-white dark:bg-gray-900",
    iconClass: "text-red-500",
    bar: "bg-red-500",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200/70 dark:border-amber-500/30",
    bg: "bg-white dark:bg-gray-900",
    iconClass: "text-amber-500",
    bar: "bg-amber-500",
  },
  info: {
    icon: Info,
    border: "border-blue-200/70 dark:border-blue-500/30",
    bg: "bg-white dark:bg-gray-900",
    iconClass: "text-blue-500",
    bar: "bg-blue-500",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.25, type: "spring", bounce: 0.3 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md ${cfg.bg} ${cfg.border}`}
    >
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar}`}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 4, ease: "linear" }}
      />

      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon size={20} className={`flex-shrink-0 mt-0.5 ${cfg.iconClass}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useToast(): ToastMethods {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2, type: "spring", bounce: 0.25 }}
            className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-700 shadow-2xl w-full max-w-sm p-6 relative"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${options.danger ? "bg-red-50 dark:bg-red-500/10" : "bg-amber-50 dark:bg-amber-500/10"}`}>
              <AlertTriangle size={24} className={options.danger ? "text-red-500" : "text-amber-500"} />
            </div>
            <h3 className="text-lg font-black text-center text-slate-900 dark:text-white mb-2">{options.title}</h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">{options.message}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white transition ${options.danger ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25" : "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"}`}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
