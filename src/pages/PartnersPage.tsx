/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Handshake,
  Layers,
  Loader2,
  Plus,
  User,
  X,
} from 'lucide-react';
import { formatDisplayDate, today } from '../logic';
import { useOpsHub } from '../store';
import { PartnerIssueRecord, PartnerRecord } from '../types';

export const PartnersPage: React.FC = () => {
  const { lists, tables, serverDate, createRecord, updateRecord, showToast } =
    useOpsHub();
  const currentDate = today(serverDate);
  const people = lists.People || ['Lourans'];
  const partners = tables.Partners || [];
  const partnerIssues = tables['Partner Issues'] || [];

  const [selectedPartner, setSelectedPartner] = useState<PartnerRecord | null>(
    null
  );
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);

  // New Partner Form
  const [newBusiness, setNewBusiness] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newStage, setNewStage] = useState('Active');
  const [newTerms, setNewTerms] = useState('');
  const [newStockPlaced, setNewStockPlaced] = useState('');
  const [newSettlement, setNewSettlement] = useState('Monthly');
  const [newNextCheckin, setNewNextCheckin] = useState(currentDate);
  const [newDocuments, setNewDocuments] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);

  // New Issue Form for Partner
  const [newIssueText, setNewIssueText] = useState('');
  const [newIssueOwner, setNewIssueOwner] = useState(people[0] || 'Lourans');
  const [newIssueNextStep, setNewIssueNextStep] = useState('');
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  // Filter issues for selected partner
  const activePartnerIssues = selectedPartner
    ? partnerIssues.filter(
        (i) =>
          (i.Partner || '').trim().toLowerCase() ===
          (selectedPartner.Business || '').trim().toLowerCase()
      )
    : [];

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusiness.trim()) return;

    setIsCreatingPartner(true);
    try {
      await createRecord('Partners', {
        Business: newBusiness.trim(),
        Contact: newContact.trim(),
        Stage: newStage,
        Terms: newTerms.trim(),
        'Stock Placed': newStockPlaced.trim(),
        Settlement: newSettlement.trim(),
        'Last Contact': currentDate,
        'Next Check-in': newNextCheckin,
        Documents: newDocuments.trim(),
        Notes: newNotes.trim(),
      });

      setNewBusiness('');
      setNewContact('');
      setNewTerms('');
      setNewStockPlaced('');
      setNewDocuments('');
      setNewNotes('');
      setIsAddPartnerOpen(false);
      showToast('Partner added successfully', 'success');
    } catch {
      // Toast handles error
    } finally {
      setIsCreatingPartner(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !newIssueText.trim()) return;

    setIsCreatingIssue(true);
    try {
      await createRecord('Partner Issues', {
        Partner: selectedPartner.Business,
        Issue: newIssueText.trim(),
        Owner: newIssueOwner,
        Opened: currentDate,
        Status: 'Open',
        'Next Step': newIssueNextStep.trim(),
        Source: 'Ops Hub',
      });

      setNewIssueText('');
      setNewIssueNextStep('');
      setIsAddIssueOpen(false);
      showToast('Issue logged for partner', 'success');
    } catch {
      // Toast handles error
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const handleResolveIssue = async (issue: PartnerIssueRecord) => {
    try {
      await updateRecord('Partner Issues', issue, { Status: 'Resolved' });
      showToast('Partner issue marked as Resolved 🎉', 'success');
    } catch {
      // Toast handles error
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Partners
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            B2B accounts, stock agreements, settlements &amp; resolutions
          </p>
        </div>

        <button
          onClick={() => setIsAddPartnerOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-violet-400 stroke-[3]" />
          <span>Add partner</span>
        </button>
      </div>

      {/* Partner Cards Grid */}
      {partners.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs">
          <div className="text-3xl mb-2">🤝</div>
          <h3 className="font-semibold text-stone-900 text-base">
            No partners yet
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Tap &quot;Add partner&quot; to register your first active account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => {
            // Count open issues for this partner
            const openIssuesCount = partnerIssues.filter(
              (i) =>
                (i.Partner || '').trim().toLowerCase() ===
                  (partner.Business || '').trim().toLowerCase() &&
                (i.Status || '').trim() !== 'Resolved'
            ).length;

            const checkinInfo = formatDisplayDate(
              partner['Next Check-in'],
              currentDate
            );

            return (
              <div
                key={partner.PartnerID || partner._row}
                onClick={() => setSelectedPartner(partner)}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs hover:border-violet-400 cursor-pointer transition-all border-l-4 border-l-violet-500 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-stone-900 text-base">
                      {partner.Business}
                    </h3>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                      {partner.Stage || 'Active'}
                    </span>
                  </div>

                  {partner.Contact && (
                    <div className="text-xs text-stone-500 mt-1">
                      Contact: {partner.Contact}
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                    {partner.Settlement && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Settlement:</span>
                        <span className="font-medium text-stone-800">
                          {partner.Settlement}
                        </span>
                      </div>
                    )}
                    {partner['Stock Placed'] && (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Stock placed:</span>
                        <span className="font-medium text-stone-800">
                          {partner['Stock Placed']}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-stone-400 text-[11px] block">
                      Next check-in
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        checkinInfo.isLate ? 'text-rose-600' : 'text-stone-700'
                      }`}
                    >
                      {checkinInfo.badge || checkinInfo.formatted}
                    </span>
                  </div>

                  {openIssuesCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 font-mono">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      {openIssuesCount} {openIssuesCount === 1 ? 'issue' : 'issues'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Healthy
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Partner Details Drawer */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-mono text-stone-500">
                  {selectedPartner.PartnerID || `#${selectedPartner._row}`}
                </span>
                <h3 className="text-xl font-bold text-stone-900">
                  {selectedPartner.Business}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Stage
                  </div>
                  <div className="text-stone-900 font-semibold text-sm mt-0.5">
                    {selectedPartner.Stage}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Settlement
                  </div>
                  <div className="text-stone-900 font-semibold text-sm mt-0.5">
                    {selectedPartner.Settlement || 'None'}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl space-y-2">
                <div>
                  <span className="text-stone-400">Contact:</span>{' '}
                  <span className="text-stone-800 font-medium">
                    {selectedPartner.Contact || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Terms:</span>{' '}
                  <span className="text-stone-800">
                    {selectedPartner.Terms || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Stock Placed:</span>{' '}
                  <span className="text-stone-800">
                    {selectedPartner['Stock Placed'] || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Next Check-in:</span>{' '}
                  <span className="font-mono text-stone-800 font-semibold">
                    {selectedPartner['Next Check-in'] || 'Not scheduled'}
                  </span>
                </div>
              </div>

              {selectedPartner.Documents && (
                <div className="p-3 bg-stone-50 rounded-xl flex items-center justify-between">
                  <span className="text-stone-600 font-medium flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Partner Documents
                  </span>
                  <a
                    href={selectedPartner.Documents}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <span>Open documents</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Partner Issues Section */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-violet-600" />
                    <h4 className="font-bold text-stone-900 text-sm">
                      Partner Issues ({activePartnerIssues.length})
                    </h4>
                  </div>

                  <button
                    onClick={() => setIsAddIssueOpen(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-violet-50 text-violet-800 hover:bg-violet-100 border border-violet-200 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add issue</span>
                  </button>
                </div>

                {activePartnerIssues.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-stone-50 text-center text-xs text-stone-400 italic">
                    No open or logged issues for this partner 🎉
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activePartnerIssues.map((issue) => {
                      const isResolved = issue.Status === 'Resolved';
                      return (
                        <div
                          key={issue.IssueID || issue._row}
                          className={`p-3.5 rounded-2xl border transition-colors flex items-start justify-between gap-3 ${
                            isResolved
                              ? 'bg-stone-50 border-stone-200 text-stone-500'
                              : 'bg-white border-stone-200 shadow-xs text-stone-900'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-xs leading-snug">
                              {issue.Issue}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              Status: {issue.Status} • Owner: {issue.Owner}
                              {issue['Next Step'] && (
                                <div className="text-stone-700 mt-0.5">
                                  Next step: {issue['Next Step']}
                                </div>
                              )}
                            </div>
                          </div>

                          {!isResolved && (
                            <button
                              onClick={() => handleResolveIssue(issue)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors shrink-0"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Issue Modal */}
      {isAddIssueOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-semibold text-stone-900 text-base">
              Add Issue for {selectedPartner.Business}
            </h3>

            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Issue Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  value={newIssueText}
                  onChange={(e) => setNewIssueText(e.target.value)}
                  placeholder="e.g. Broken display box, incorrect invoice, delayed refill..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Owner
                </label>
                <select
                  value={newIssueOwner}
                  onChange={(e) => setNewIssueOwner(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                >
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Immediate Next Step
                </label>
                <input
                  type="text"
                  value={newIssueNextStep}
                  onChange={(e) => setNewIssueNextStep(e.target.value)}
                  placeholder="e.g. Courier replacement unit by Tuesday"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddIssueOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingIssue || !newIssueText.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-colors"
                >
                  {isCreatingIssue ? 'Saving...' : 'Add Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Partner Modal */}
      {isAddPartnerOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-semibold text-stone-900 text-base">New Partner</h3>
              <button
                onClick={() => setIsAddPartnerOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newBusiness}
                  onChange={(e) => setNewBusiness(e.target.value)}
                  placeholder="e.g. Selfridges Gourmet"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Settlement
                  </label>
                  <input
                    type="text"
                    value={newSettlement}
                    onChange={(e) => setNewSettlement(e.target.value)}
                    placeholder="e.g. Net 30 / Monthly"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Stock Placed
                  </label>
                  <input
                    type="text"
                    value={newStockPlaced}
                    onChange={(e) => setNewStockPlaced(e.target.value)}
                    placeholder="e.g. 100 units on consignment"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Next Check-in
                  </label>
                  <input
                    type="date"
                    value={newNextCheckin}
                    onChange={(e) => setNewNextCheckin(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Documents Link
                </label>
                <input
                  type="url"
                  value={newDocuments}
                  onChange={(e) => setNewDocuments(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPartner || !newBusiness.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-colors"
                >
                  {isCreatingPartner ? 'Saving...' : 'Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
