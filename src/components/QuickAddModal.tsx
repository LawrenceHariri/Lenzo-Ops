/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react';
import { today } from '../logic';
import { useOpsHub } from '../store';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { lists, serverDate, createRecord } = useOpsHub();

  const currentDate = today(serverDate);
  const people = lists.People || ['Lourans'];
  const areas = lists.Area || ['Admin', 'Ops', 'Growth', 'Product', 'Team'];
  const priorities = lists.Priority || ['High', 'Medium', 'Low'];

  const [what, setWhat] = useState('');
  const [who, setWho] = useState(() => (people.includes('Lourans') ? 'Lourans' : people[0] || 'Lourans'));
  const [when, setWhen] = useState(currentDate);

  // "More" expanded fields
  const [showMore, setShowMore] = useState(false);
  const [area, setArea] = useState('Admin');
  const [priority, setPriority] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) return;

    setIsSubmitting(true);
    try {
      await createRecord('Tasks', {
        Task: what.trim(),
        Owner: who,
        Due: when,
        Status: 'Open',
        'Given On': currentDate,
        Priority: priority,
        Area: area,
        Notes: notes.trim(),
        Source: source.trim(),
      });

      // Reset
      setWhat('');
      setNotes('');
      setSource('');
      setShowMore(false);
      onClose();
    } catch {
      // Toast handles error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-stone-200 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div>
            <h3 className="font-semibold text-stone-900 text-base">Quick Add Task</h3>
            <p className="text-xs text-stone-500">Capture what needs doing in seconds</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
              What
            </label>
            <input
              type="text"
              required
              autoFocus
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="e.g. Call supplier regarding delay..."
              className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                Who
              </label>
              <select
                value={who}
                onChange={(e) => setWho(e.target.value)}
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
              <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
                When
              </label>
              <input
                type="date"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          {/* More expandable fields */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
            >
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showMore ? 'Fewer options' : 'More options (Area, Priority, Notes)'}</span>
            </button>

            {showMore && (
              <div className="mt-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      Area
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl text-stone-900"
                    >
                      {areas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl text-stone-900"
                    >
                      {priorities.map((pr) => (
                        <option key={pr} value={pr}>
                          {pr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Context or links..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl text-stone-900"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !what.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
