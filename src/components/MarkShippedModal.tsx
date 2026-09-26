/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Loader2, PackageCheck, Truck, X } from 'lucide-react';
import { addDays, today } from '../logic';
import { useOpsHub } from '../store';
import { SampleRecord } from '../types';

interface MarkShippedModalProps {
  sample: SampleRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MarkShippedModal: React.FC<MarkShippedModalProps> = ({
  sample,
  onClose,
  onSuccess,
}) => {
  const { lists, serverDate, updateRecord, showToast } = useOpsHub();
  const currentDate = today(serverDate);
  const people = lists.People || ['Lourans'];

  const [shippedOn, setShippedOn] = useState(currentDate);
  const [followUpDue, setFollowUpDue] = useState(() => addDays(currentDate, 3));
  const [owner, setOwner] = useState('');
  const [tracking, setTracking] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sample) {
      setShippedOn(currentDate);
      setFollowUpDue(addDays(currentDate, 3));
      setOwner(sample.Owner || (people.includes('Lourans') ? 'Lourans' : people[0] || ''));
      setTracking(sample.Tracking || '');
    }
  }, [sample, currentDate, people]);

  if (!sample) return null;

  const handleShippedOnChange = (newShippedOn: string) => {
    setShippedOn(newShippedOn);
    // Automatically update Follow-up Due if it was previously 3 days from old shippedOn
    setFollowUpDue(addDays(newShippedOn, 3));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation requirement:
    // "REQUIRES Shipped On (default today), Follow-up Due (default Shipped On + 3 days) and Owner. Tracking optional. Only then set Stage = 'Shipped'."
    if (!shippedOn.trim()) {
      showToast('Shipped On date is required', 'error');
      return;
    }
    if (!followUpDue.trim()) {
      showToast('Follow-up Due date is required', 'error');
      return;
    }
    if (!owner.trim()) {
      showToast('Sample Owner is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateRecord('Samples', sample, {
        Stage: 'Shipped',
        'Shipped On': shippedOn.trim(),
        'Follow-up Due': followUpDue.trim(),
        Owner: owner.trim(),
        Tracking: tracking.trim(),
      });

      showToast(`Sample for ${sample.Business || 'Client'} marked as Shipped! 📦`, 'success');
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
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-base">Mark as Shipped</h3>
              <p className="text-xs text-stone-500 truncate max-w-[220px]">
                {sample.Business} {sample.City ? `(${sample.City})` : ''}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
            Follow-up date and owner are required so samples are never forgotten after dispatch.
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Shipped On <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={shippedOn}
              onChange={(e) => handleShippedOnChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Follow-up Due <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={followUpDue}
              onChange={(e) => setFollowUpDue(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Default is 3 days after shipping date
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Owner <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            >
              <option value="">Select owner...</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Tracking Number <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. Royal Mail / DHL tracking"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !shippedOn || !followUpDue || !owner}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  Mark Shipped
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
