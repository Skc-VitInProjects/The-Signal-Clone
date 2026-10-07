'use client';

import React, { useState, useEffect } from 'react';
import { Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type?: 'info' | 'success' | 'warning';
  title?: string;
  message: string;
}

let toastListener: ((toast: ToastItem) => void) | null = null;

export function showToast(message: string, type: 'info' | 'success' | 'warning' = 'info', title?: string) {
  if (toastListener) {
    toastListener({
      id: Math.random().toString(),
      type,
      title,
      message,
    });
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.type === 'success' && <CheckCircle2 size={18} color="var(--signal-green)" />}
          {t.type === 'warning' && <AlertTriangle size={18} color="var(--signal-orange)" />}
          {t.type === 'info' && <Info size={18} color="var(--signal-blue)" />}
          
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.message}</div>
          </div>

          <button
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            style={{ opacity: 0.6 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
