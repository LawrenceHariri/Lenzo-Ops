/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Bell, Calendar, Clock, Loader2, Sparkles, X } from 'lucide-react';
import { formatDateValue, formatDateTimeValue } from '../api';
import { today } from '../logic';
import { useOpsHub } from '../store';

interface RemindMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialDate?: string; // YYYY-MM-DD
}

export const RemindMeModal: React.FC<RemindMeModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialDate,
}) => {
  const { createReminder, serverDate, showToast } = useOpsHub();
  const currentDate = today(serverDate);

  const [text, setText] = useState('');
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize defaults when opened
  useEffect(() => {
    if (isOpen) {
      setText(initialText || '');

      // Compute nearest upcoming convenient time
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const hh = String(nextHour.getHours()).padStart(2, '0');
      const mm = nextHour.getMinutes() < 30 ? '30' : '00';

      if (initialDate && formatDateValue(initialDate)) {
        setDate(formatDateValue(initialDate));
        setTime('09:00');
      } else {
        setDate(currentDate);
        setTime(`${hh}:${mm}`);
      }
    }
  }, [isOpen, initialText, initialDate, currentDate]);

  if (!isOpen) return null;

  // Preset quick buttons
  const applyPreset = (preset: '1h' | 'tomorrow9' | 'tomorrow14' | 'in3d' | 'nextMonday') => {
    const now = new Date();
    if (preset === '1h') {
      const target = new Date(now.getTime() + 60 * 60 * 1000);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      const hh = String(target.getHours()).padStart(2, '0');
      const mm = String(target.getMinutes()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      setTime(`${hh}:${mm}`);
    } else if (preset === 'tomorrow9') {
      const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      setTime('09:00');
    } else if (preset === 'tomorrow14') {
      const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      setTime('14:00');
    } else if (preset === 'in3d') {
      const target = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      setTime('09:00');
    } else if (preset === 'nextMonday') {
      const target = new Date(now);
      const day = target.getDay(); // 0 is Sun
      const daysUntilMonday = ((1 + 7 - day) % 7) || 7;
      target.setDate(target.getDate() + daysUntilMonday);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, '0');
      const d = String(target.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      setTime('09:00');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      showToast('Please enter what you want to be reminded about.', 'error');
      return;
    }

    const cleanDate = formatDateValue(date) || currentDate;
    const cleanTime = time.trim() || '09:00';
    const whenCombined = `${cleanDate} ${cleanTime}`;
    const formattedWhen = formatDateTimeValue(whenCombined);

    setIsSubmitting(true);
    try {
      await createReminder(text.trim(), formattedWhen, 'None');
      onClose();
    } catch (err: any) {
      // Toast already shown in createReminder
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold">
              <span className="text-xl">⏰</span>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-base">Remind me</h3>
              <p className="text-xs text-stone-500">
                Google Calendar event &amp; Sheet sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Quick Timing
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('1h')}
                className="px-2.5 py-1 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-700 transition-colors cursor-pointer"
              >
                In 1 hour
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tomorrow9')}
                className="px-2.5 py-1 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-700 transition-colors cursor-pointer"
              >
                Tomorrow 9am
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tomorrow14')}
                className="px-2.5 py-1 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-700 transition-colors cursor-pointer"
              >
                Tomorrow 2pm
              </button>
              <button
                type="button"
                onClick={() => applyPreset('in3d')}
                className="px-2.5 py-1 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-700 transition-colors cursor-pointer"
              >
                In 3 days
              </button>
              <button
                type="button"
                onClick={() => applyPreset('nextMonday')}
                className="px-2.5 py-1 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-700 transition-colors cursor-pointer"
              >
                Next Mon
              </button>
            </div>
          </div>

          {/* Reminder Text */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              What do you need to be reminded of? *
            </label>
            <input
              type="text"
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Call client back regarding sample review"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
          </div>

          {/* Date and Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Time (24h)</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Details notification notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 leading-relaxed space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span>Calendar Event Details</span>
            </div>
            <div>
              Creates a 15-minute event with title <code className="font-semibold text-amber-950">⏰ {text || '...'}</code> and an instant popup alert at the start time.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Setting reminder...</span>
                </>
              ) : (
                <>
                  <span>⏰ Set Reminder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
