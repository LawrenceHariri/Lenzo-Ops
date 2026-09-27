/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flag,
  Layers,
  Loader2,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { formatDisplayDate, today } from '../logic';
import { useOpsHub } from '../store';
import { TaskRecord } from '../types';
import { fireTaskDoneConfetti } from '../utils/confetti';
import { RemindMeModal } from './RemindMeModal';

interface TaskEditDrawerProps {
  task: TaskRecord | null;
  onClose: () => void;
}

export const TaskEditDrawer: React.FC<TaskEditDrawerProps> = ({
  task,
  onClose,
}) => {
  const { lists, serverDate, updateRecord, showToast } = useOpsHub();
  const currentDate = today(serverDate);

  const [formData, setFormData] = useState<Partial<TaskRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [remindModalOpen, setRemindModalOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        Task: task.Task || '',
        Owner: task.Owner || '',
        Area: task.Area || '',
        Priority: task.Priority || 'Medium',
        'Given On': task['Given On'] || '',
        Due: task.Due || '',
        Status: task.Status || 'Open',
        Source: task.Source || '',
        Notes: task.Notes || '',
      });
    }
  }, [task]);

  if (!task) return null;

  const people = lists.People || ['Lourans'];
  const areas = lists.Area || ['Admin', 'Ops', 'Growth', 'Product', 'Team'];
  const priorities = lists.Priority || ['High', 'Medium', 'Low'];
  const statuses = lists.TaskStatus || ['Open', 'Waiting', 'Check', 'Done', 'Dropped'];

  const isCheckStatus = formData.Status === 'Check';
  const isDone = formData.Status === 'Done';

  const handleFieldChange = (field: keyof TaskRecord, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setIsSaving(true);
    try {
      await updateRecord('Tasks', task, formData);
      if (formData.Status === 'Done' && task.Status !== 'Done') {
        fireTaskDoneConfetti();
        showToast('Nice. One less thing.', 'success');
      } else {
        showToast('Task updated', 'success');
      }
      onClose();
    } catch {
      // Toast handles error
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkDone = async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      await updateRecord('Tasks', task, { Status: 'Done' });
      fireTaskDoneConfetti();
      showToast('Nice. One less thing.', 'success');
      onClose();
    } catch {
      // Toast handles error
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      await updateRecord('Tasks', task, { Status: 'Dropped' });
      showToast('Task dropped', 'info');
      onClose();
    } catch {
      // Toast handles error
    } finally {
      setIsSaving(false);
    }
  };

  const isSourceUrl =
    formData.Source &&
    (formData.Source.startsWith('http://') || formData.Source.startsWith('https://'));

  const dateInfo = formatDisplayDate(formData.Due, currentDate);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-start justify-between gap-4 sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                {task.TaskID || `#${task._row}`}
              </span>
              {isCheckStatus && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Verify this
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-stone-900 leading-tight">
              Edit Task
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="task-form" onSubmit={handleSave} className="p-6 space-y-5 flex-1">
          {/* Task title */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Task
            </label>
            <textarea
              rows={3}
              required
              value={formData.Task || ''}
              onChange={(e) => handleFieldChange('Task', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium leading-relaxed"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={formData.Status || 'Open'}
                onChange={(e) => handleFieldChange('Status', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={formData.Priority || 'Medium'}
                onChange={(e) => handleFieldChange('Priority', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Owner & Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Owner
              </label>
              <select
                value={formData.Owner || ''}
                onChange={(e) => handleFieldChange('Owner', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Area
              </label>
              <select
                value={formData.Area || ''}
                onChange={(e) => handleFieldChange('Area', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date & Given on */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Due Date
                </label>
                <button
                  type="button"
                  onClick={() => setRemindModalOpen(true)}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  title="Schedule Google Calendar reminder for this task"
                >
                  <span>⏰ Remind me</span>
                </button>
              </div>
              <input
                type="date"
                value={formData.Due || ''}
                onChange={(e) => handleFieldChange('Due', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
              />
              {dateInfo.badge && (
                <div
                  className={`text-[11px] mt-1 font-medium ${
                    dateInfo.isLate
                      ? 'text-rose-600'
                      : dateInfo.isToday
                      ? 'text-amber-600'
                      : 'text-stone-500'
                  }`}
                >
                  {dateInfo.badge}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Given On
              </label>
              <input
                type="date"
                value={formData['Given On'] || ''}
                onChange={(e) => handleFieldChange('Given On', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Source Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Source
              </label>
              {isSourceUrl && (
                <a
                  href={formData.Source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Open link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <input
              type="text"
              value={formData.Source || ''}
              onChange={(e) => handleFieldChange('Source', e.target.value)}
              placeholder="Source, Slack url, or Doc reference"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              rows={4}
              value={formData.Notes || ''}
              onChange={(e) => handleFieldChange('Notes', e.target.value)}
              placeholder="Any details, blockers, or context..."
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3 sticky bottom-0">
          <div className="flex items-center gap-2">
            {!isDone ? (
              <button
                type="button"
                onClick={handleMarkDone}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark Done</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFieldChange('Status', 'Open')}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors"
              >
                Reopen
              </button>
            )}

            <button
              type="button"
              onClick={handleDrop}
              disabled={isSaving}
              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Drop task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              disabled={isSaving}
              className="px-5 py-2 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </div>
      </div>

      <RemindMeModal
        isOpen={remindModalOpen}
        onClose={() => setRemindModalOpen(false)}
        initialText={formData.Task || task.Task}
        initialDate={formData.Due || task.Due}
      />
    </div>
  );
};
