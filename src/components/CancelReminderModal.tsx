/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, CalendarX, Loader2, X } from 'lucide-react';
import { useOpsHub } from '../store';
import { ReminderRecord } from '../types';

interface CancelReminderModalProps {
  reminder: ReminderRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CancelReminderModal: React.FC<CancelReminderModalProps> = ({
  reminder,
  onClose,
  onSuccess,
}) => {
  const { cancelReminder, showToast } = useOpsHub();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!reminder) return null;

  const handleConfirmCancel = async () => {
    setIsDeleting(true);
    try {
      await cancelReminder(reminder);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel reminder', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
            <CalendarX className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-stone-900 text-base">
            Cancel Reminder?
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            This will delete the event from Google Calendar and mark the reminder as <span className="font-semibold text-rose-600">Cancelled</span> in the Sheet.
          </p>
        </div>

        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-1">
          <div className="font-medium text-stone-900 truncate">
            ⏰ {reminder.Text}
          </div>
          <div className="text-[11px] text-stone-500 font-mono">
            When: {reminder.When}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-2xl transition-colors cursor-pointer"
          >
            Keep Reminder
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Yes, Cancel</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
