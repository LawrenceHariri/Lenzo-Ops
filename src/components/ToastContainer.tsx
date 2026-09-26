/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useOpsHub } from '../store';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useOpsHub();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-lg transition-all duration-200 ${
              isError
                ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100/50'
                : isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100/50'
                : 'bg-white border-stone-200 text-stone-800 shadow-stone-200/50'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {!isError && !isSuccess && <Info className="w-4 h-4 text-stone-500" />}
            </div>
            <div className="flex-1 text-xs font-medium leading-snug break-words">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 -mr-1 -mt-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </aside>
  );
};
