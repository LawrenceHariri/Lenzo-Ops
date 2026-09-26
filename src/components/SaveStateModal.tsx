/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Flame, Loader2, Sparkles, X } from 'lucide-react';
import { calculateSaveStreak, today } from '../logic';
import { useOpsHub } from '../store';

interface SaveStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SaveStateModal: React.FC<SaveStateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { lists, tables, serverDate, createRecord, showToast } = useOpsHub();
  const currentDate = today(serverDate);

  const areas = lists.Area || ['Ops', 'Growth', 'Admin', 'Product', 'Team'];
  const energies = lists.Energy || ['High', 'Medium', 'Low', 'Exhausted', 'Energized'];

  const [area, setArea] = useState(areas[0] || 'Ops');
  const [nextAction, setNextAction] = useState('');
  const [inMyHead, setInMyHead] = useState('');
  const [dontRedo, setDontRedo] = useState('');
  const [energy, setEnergy] = useState(energies[0] || 'Medium');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const currentStreak = calculateSaveStreak(tables['Save State'], currentDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextAction.trim()) {
      showToast('Next Action is required to clear your mind.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await createRecord('Save State', {
        Date: currentDate,
        Area: area,
        'Next Action': nextAction.trim(),
        'In My Head': inMyHead.trim(),
        "Don't Redo": dontRedo.trim(),
        Energy: energy,
      });

      showToast('State saved! Rest well, you earned it. 🌙', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      // Toast handles error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900 text-base">Save Your State</h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full font-mono">
                  <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                  {currentStreak}d streak
                </span>
              </div>
              <p className="text-xs text-stone-500">
                60 seconds to dump your brain so tomorrow starts effortlessly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Primary Area
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Current Energy
              </label>
              <select
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                {energies.map((eng) => (
                  <option key={eng} value={eng}>
                    {eng}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Tomorrow&apos;s #1 Next Action <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="The single thing to start with tomorrow morning"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              In My Head (Brain dump)
            </label>
            <textarea
              rows={2}
              value={inMyHead}
              onChange={(e) => setInMyHead(e.target.value)}
              placeholder="Lingering thoughts, open loops, loose ends..."
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Don&apos;t Redo
            </label>
            <input
              type="text"
              value={dontRedo}
              onChange={(e) => setDontRedo(e.target.value)}
              placeholder="Mistakes, wasted rabbit holes, or things to avoid doing again"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !nextAction.trim()}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving state...
                </>
              ) : (
                'Save state & close day'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
