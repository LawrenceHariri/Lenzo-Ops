/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Headphones,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ShoppingBag,
  Ticket,
  X,
} from 'lucide-react';
import { formatDisplayDate, today } from '../logic';
import { useOpsHub } from '../store';
import { SupportRecord } from '../types';

export const SupportPage: React.FC = () => {
  const { lists, tables, serverDate, createRecord, updateRecord, showToast } =
    useOpsHub();
  const currentDate = today(serverDate);
  const channels = lists.Channel || [
    'Email',
    'Instagram',
    'WhatsApp',
    'Phone',
    'Shopify',
  ];

  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);

  // New ticket state
  const [newCustomer, setNewCustomer] = useState('');
  const [newChannel, setNewChannel] = useState(channels[0] || 'Email');
  const [newIssue, setNewIssue] = useState('');
  const [newNextStep, setNewNextStep] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<SupportRecord | null>(
    null
  );

  // Tickets sorted open first
  const tickets = useMemo(() => {
    const list = [...(tables.Support || [])];

    // Filter
    const filtered = list.filter((t) => {
      const isResolved = (t.Status || '').trim() === 'Resolved';
      if (filter === 'open') return !isResolved;
      if (filter === 'resolved') return isResolved;
      return true;
    });

    // Sort: Open first, then by Opened date (newest first)
    return filtered.sort((a, b) => {
      const aResolved = (a.Status || '').trim() === 'Resolved';
      const bResolved = (b.Status || '').trim() === 'Resolved';
      if (!aResolved && bResolved) return -1;
      if (aResolved && !bResolved) return 1;
      return (b.Opened || '').localeCompare(a.Opened || '');
    });
  }, [tables.Support, filter]);

  const handleResolveTicket = async (ticket: SupportRecord) => {
    try {
      await updateRecord('Support', ticket, { Status: 'Resolved' });
      showToast('Ticket marked as Resolved! 🎉', 'success');
    } catch {
      // Toast handles error
    }
  };

  const handleReopenTicket = async (ticket: SupportRecord) => {
    try {
      await updateRecord('Support', ticket, { Status: 'Open' });
      showToast('Ticket reopened', 'info');
    } catch {
      // Toast handles error
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newIssue.trim()) return;

    setIsCreatingTicket(true);
    try {
      await createRecord('Support', {
        Customer: newCustomer.trim(),
        Channel: newChannel,
        Issue: newIssue.trim(),
        Opened: currentDate,
        Status: 'Open',
        'Next Step': newNextStep.trim(),
        Notes: newNotes.trim(),
      });

      setNewCustomer('');
      setNewIssue('');
      setNewNextStep('');
      setNewNotes('');
      setIsAddTicketOpen(false);
      showToast('Support ticket logged', 'success');
    } catch {
      // Toast handles error
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Helper channel icon
  const getChannelIcon = (ch?: string) => {
    const lower = (ch || '').toLowerCase();
    if (lower.includes('instagram')) return <Instagram className="w-4 h-4 text-pink-600" />;
    if (lower.includes('whatsapp')) return <MessageCircle className="w-4 h-4 text-emerald-600" />;
    if (lower.includes('phone')) return <Phone className="w-4 h-4 text-blue-600" />;
    if (lower.includes('shopify')) return <ShoppingBag className="w-4 h-4 text-emerald-700" />;
    return <Mail className="w-4 h-4 text-stone-500" />;
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Support
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Customer inquiries across all retail and online channels
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Filter pills */}
          <div className="flex items-center p-1 bg-stone-100 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setFilter('open')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'open'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'resolved'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filter === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={() => setIsAddTicketOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-rose-400 stroke-[3]" />
            <span>Add ticket</span>
          </button>
        </div>
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="font-semibold text-stone-900 text-base">
            {filter === 'open' ? 'Inbox zero!' : 'No tickets in this view'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {filter === 'open'
              ? 'All customer support tickets are currently resolved.'
              : 'Switch filters or tap "Add ticket" to log a new inquiry.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden">
          {tickets.map((ticket) => {
            const isResolved = ticket.Status === 'Resolved';
            const dateInfo = formatDisplayDate(ticket.Opened, currentDate);

            return (
              <div
                key={ticket.TicketID || ticket._row}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors cursor-pointer border-l-4 ${
                  isResolved ? 'border-l-stone-300 opacity-60' : 'border-l-rose-500'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2 rounded-xl bg-stone-100 shrink-0 mt-0.5">
                    {getChannelIcon(ticket.Channel)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">
                        {ticket.Customer}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        {ticket.TicketID || `#${ticket._row}`}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.2 rounded-full bg-stone-100 text-stone-600">
                        {ticket.Channel}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 font-medium mt-1 line-clamp-2">
                      {ticket.Issue}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 mt-1">
                      <span>Opened: {dateInfo.formatted}</span>
                      {ticket['Next Step'] && (
                        <span className="text-rose-700 font-medium">
                          Next: {ticket['Next Step']}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 self-start sm:self-auto shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isResolved ? (
                    <button
                      onClick={() => handleResolveTicket(ticket)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Resolve</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReopenTicket(ticket)}
                      className="px-3 py-1 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Details Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-mono text-stone-500">
                  {selectedTicket.TicketID || `#${selectedTicket._row}`}
                </span>
                <h3 className="text-xl font-bold text-stone-900">
                  {selectedTicket.Customer}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Channel
                  </div>
                  <div className="text-stone-900 font-semibold text-sm mt-0.5 flex items-center gap-1.5">
                    {getChannelIcon(selectedTicket.Channel)}
                    <span>{selectedTicket.Channel}</span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Status
                  </div>
                  <div className="text-stone-900 font-semibold text-sm mt-0.5">
                    {selectedTicket.Status}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl space-y-1">
                <div className="text-stone-400 font-semibold uppercase text-[10px]">
                  Issue Description
                </div>
                <p className="text-stone-900 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.Issue}
                </p>
              </div>

              {selectedTicket['Next Step'] && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200/70 rounded-2xl space-y-1">
                  <div className="text-[10px] font-bold text-rose-900 uppercase">
                    Immediate Next Step
                  </div>
                  <div className="text-stone-900 font-medium">
                    {selectedTicket['Next Step']}
                  </div>
                </div>
              )}

              {selectedTicket.Notes && (
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Notes &amp; Context
                  </div>
                  <p className="text-stone-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.Notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              {selectedTicket.Status !== 'Resolved' ? (
                <button
                  onClick={() => {
                    handleResolveTicket(selectedTicket);
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Resolved</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleReopenTicket(selectedTicket);
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-2xl text-xs"
                >
                  Reopen Ticket
                </button>
              )}

              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ticket Modal */}
      {isAddTicketOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-semibold text-stone-900 text-base">New Support Ticket</h3>
              <button
                onClick={() => setIsAddTicketOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Customer Name / Handle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="e.g. Alex Miller (@alexm)"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Channel
                </label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                >
                  {channels.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Issue Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={newIssue}
                  onChange={(e) => setNewIssue(e.target.value)}
                  placeholder="What happened or what is requested..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Immediate Next Step
                </label>
                <input
                  type="text"
                  value={newNextStep}
                  onChange={(e) => setNewNextStep(e.target.value)}
                  placeholder="e.g. Reply with return label"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Notes / Order #
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Order #1042, damaged tin"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddTicketOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTicket || !newCustomer.trim() || !newIssue.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors"
                >
                  {isCreatingTicket ? 'Saving...' : 'Add Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
