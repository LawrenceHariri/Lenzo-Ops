/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Send,
  Truck,
  User,
  X,
} from 'lucide-react';
import { MarkShippedModal } from '../components/MarkShippedModal';
import { formatDisplayDate, today } from '../logic';
import { useOpsHub } from '../store';
import { LeadRecord, SampleRecord } from '../types';

type PipelineTab = 'samples' | 'leads';

const SAMPLE_STAGES = [
  'Requested',
  'Address confirmed',
  'Shipped',
  'Follow-up done',
  'Feedback received',
  'Partner',
  'Lost',
];

const LEAD_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Sample Sent',
  'Negotiation',
  'Won',
  'Lost',
];

export const PipelinePage: React.FC = () => {
  const { lists, tables, serverDate, createRecord, updateRecord, showToast } =
    useOpsHub();
  const currentDate = today(serverDate);
  const people = lists.People || ['Lourans'];

  const [activeTab, setActiveTab] = useState<PipelineTab>('samples');

  // Mobile stage filters
  const [mobileSampleStage, setMobileSampleStage] = useState<string>('All');
  const [mobileLeadStage, setMobileLeadStage] = useState<string>('All');

  // Sample Modals & Drawers
  const [sampleToShip, setSampleToShip] = useState<SampleRecord | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleRecord | null>(null);
  const [isAddSampleOpen, setIsAddSampleOpen] = useState(false);

  // Lead Modals & Drawers
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [logContactLead, setLogContactLead] = useState<LeadRecord | null>(null);
  const [logNextStep, setLogNextStep] = useState('');
  const [logNextStepDate, setLogNextStepDate] = useState(currentDate);
  const [isLoggingContact, setIsLoggingContact] = useState(false);

  // Add Sample Form State
  const [newSampleBusiness, setNewSampleBusiness] = useState('');
  const [newSampleCity, setNewSampleCity] = useState('');
  const [newSampleOwner, setNewSampleOwner] = useState(people[0] || 'Lourans');
  const [newSampleStage, setNewSampleStage] = useState('Requested');
  const [newSampleContact, setNewSampleContact] = useState('');
  const [newSamplePhone, setNewSamplePhone] = useState('');
  const [newSampleAddress, setNewSampleAddress] = useState('');
  const [newSampleItems, setNewSampleItems] = useState('');
  const [showMoreSample, setShowMoreSample] = useState(false);
  const [isCreatingSample, setIsCreatingSample] = useState(false);

  // Add Lead Form State
  const [newLeadBusiness, setNewLeadBusiness] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('');
  const [newLeadOwner, setNewLeadOwner] = useState(people[0] || 'Lourans');
  const [newLeadStage, setNewLeadStage] = useState('New');
  const [newLeadContact, setNewLeadContact] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadNextStep, setNewLeadNextStep] = useState('');
  const [newLeadNextStepDate, setNewLeadNextStepDate] = useState(currentDate);
  const [showMoreLead, setShowMoreLead] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  // Active sample stages list
  const sampleStages = lists.SampleStage?.length
    ? lists.SampleStage
    : SAMPLE_STAGES;

  // Active lead stages list
  const leadStages = lists.LeadStage?.length ? lists.LeadStage : LEAD_STAGES;

  // Samples grouped by stage
  const samplesByStage = useMemo(() => {
    const map: Record<string, SampleRecord[]> = {};
    sampleStages.forEach((st) => (map[st] = []));
    (tables.Samples || []).forEach((s) => {
      const st = s.Stage || 'Requested';
      if (!map[st]) map[st] = [];
      map[st].push(s);
    });
    return map;
  }, [tables.Samples, sampleStages]);

  // Leads grouped by stage
  const leadsByStage = useMemo(() => {
    const map: Record<string, LeadRecord[]> = {};
    leadStages.forEach((st) => (map[st] = []));
    (tables.Leads || []).forEach((l) => {
      const st = l.Stage || 'New';
      if (!map[st]) map[st] = [];
      map[st].push(l);
    });

    // Sort leads inside each stage by Next Step Date (earlier first)
    Object.keys(map).forEach((st) => {
      map[st].sort((a, b) => {
        const dA = a['Next Step Date'] || '';
        const dB = b['Next Step Date'] || '';
        if (dA && dB) return dA.localeCompare(dB);
        if (dA && !dB) return -1;
        if (!dA && dB) return 1;
        return 0;
      });
    });

    return map;
  }, [tables.Leads, leadStages]);

  // Handle Add Sample
  const handleCreateSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSampleBusiness.trim()) return;

    setIsCreatingSample(true);
    try {
      await createRecord('Samples', {
        Business: newSampleBusiness.trim(),
        City: newSampleCity.trim(),
        Owner: newSampleOwner,
        Stage: newSampleStage,
        Contact: newSampleContact.trim(),
        Phone: newSamplePhone.trim(),
        Address: newSampleAddress.trim(),
        'Items To Send': newSampleItems.trim(),
        'Requested On': currentDate,
      });

      setNewSampleBusiness('');
      setNewSampleCity('');
      setNewSampleContact('');
      setNewSamplePhone('');
      setNewSampleAddress('');
      setNewSampleItems('');
      setShowMoreSample(false);
      setIsAddSampleOpen(false);
      showToast('Sample created successfully', 'success');
    } catch {
      // Toast handles error
    } finally {
      setIsCreatingSample(false);
    }
  };

  // Handle Add Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadBusiness.trim()) return;

    setIsCreatingLead(true);
    try {
      await createRecord('Leads', {
        Business: newLeadBusiness.trim(),
        City: newLeadCity.trim(),
        Owner: newLeadOwner,
        Stage: newLeadStage,
        Contact: newLeadContact.trim(),
        Phone: newLeadPhone.trim(),
        'Next Step': newLeadNextStep.trim(),
        'Next Step Date': newLeadNextStepDate,
        'Last Contact': currentDate,
      });

      setNewLeadBusiness('');
      setNewLeadCity('');
      setNewLeadContact('');
      setNewLeadPhone('');
      setNewLeadNextStep('');
      setShowMoreLead(false);
      setIsAddLeadOpen(false);
      showToast('Lead created successfully', 'success');
    } catch {
      // Toast handles error
    } finally {
      setIsCreatingLead(false);
    }
  };

  // Handle Log Contact on Lead
  const handleSaveLogContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logContactLead) return;

    const isWonOrLost = ['Won', 'Lost'].includes(logContactLead.Stage || '');
    if (!isWonOrLost) {
      if (!logNextStep.trim()) {
        showToast('Next step is required', 'error');
        return;
      }
      if (!logNextStepDate.trim()) {
        showToast('Next step date is required', 'error');
        return;
      }
    }

    setIsLoggingContact(true);
    try {
      await updateRecord('Leads', logContactLead, {
        'Last Contact': currentDate,
        'Next Step': logNextStep.trim(),
        'Next Step Date': logNextStepDate.trim(),
      });

      showToast(`Contact logged for ${logContactLead.Business}`, 'success');
      setLogContactLead(null);
      setLogNextStep('');
    } catch {
      // Toast handles error
    } finally {
      setIsLoggingContact(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Pipeline
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Samples progression &amp; B2B client conversion
          </p>
        </div>

        {/* Tab switcher + primary add button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-stone-100 rounded-2xl">
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'samples'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Samples ({tables.Samples?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'leads'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Leads ({tables.Leads?.length || 0})
            </button>
          </div>

          <button
            onClick={() =>
              activeTab === 'samples'
                ? setIsAddSampleOpen(true)
                : setIsAddLeadOpen(true)
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{activeTab === 'samples' ? 'Add sample' : 'Add lead'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SAMPLES TAB                                                    */}
      {/* ============================================================== */}
      {activeTab === 'samples' && (
        <div className="space-y-4">
          {/* Mobile stage filter */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setMobileSampleStage('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                mobileSampleStage === 'All'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              All Stages
            </button>
            {sampleStages.map((st) => (
              <button
                key={st}
                onClick={() => setMobileSampleStage(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  mobileSampleStage === st
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                {st} ({samplesByStage[st]?.length || 0})
              </button>
            ))}
          </div>

          {/* Desktop Kanban Columns / Mobile Card List */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
            {sampleStages.map((stage) => {
              const samples = samplesByStage[stage] || [];

              return (
                <div
                  key={stage}
                  className="w-72 shrink-0 bg-stone-100/60 rounded-2xl p-3 flex flex-col max-h-[75vh]"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-stone-700 truncate">
                      {stage}
                    </span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white text-stone-600 border border-stone-200/80">
                      {samples.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto flex-1 pr-0.5">
                    {samples.map((sample) => {
                      const nextDate =
                        sample['Follow-up Due'] ||
                        sample['Shipped On'] ||
                        sample['Requested On'];
                      const dateInfo = formatDisplayDate(nextDate, currentDate);

                      return (
                        <div
                          key={sample.SampleID || sample._row}
                          onClick={() => setSelectedSample(sample)}
                          className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:border-amber-400 cursor-pointer transition-all border-l-4 border-l-amber-500 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-stone-900 text-sm leading-snug">
                              {sample.Business}
                            </h4>
                            {sample.City && (
                              <span className="text-[11px] text-stone-500 font-normal shrink-0">
                                {sample.City}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-stone-500 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-stone-400" />
                              <span>{sample.Owner || 'Unassigned'}</span>
                            </div>

                            {nextDate && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-stone-400" />
                                <span
                                  className={
                                    dateInfo.isLate
                                      ? 'text-rose-600 font-semibold'
                                      : 'text-stone-600'
                                  }
                                >
                                  {dateInfo.badge || dateInfo.formatted}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick action buttons on card */}
                          <div
                            className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {sample.Address && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  sample.Address
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-stone-500 hover:text-stone-900 flex items-center gap-1"
                              >
                                <MapPin className="w-3 h-3 text-amber-600" />
                                <span>Map</span>
                              </a>
                            )}

                            {['Requested', 'Address confirmed'].includes(
                              (sample.Stage || '').trim()
                            ) && (
                              <button
                                onClick={() => setSampleToShip(sample)}
                                className="ml-auto px-2.5 py-1 text-[11px] font-semibold bg-stone-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1"
                              >
                                <Truck className="w-3 h-3 text-amber-400" />
                                <span>Ship</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {samples.length === 0 && (
                      <div className="text-center py-8 text-stone-400 text-xs italic">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {(tables.Samples || [])
              .filter((s) =>
                mobileSampleStage === 'All' ? true : s.Stage === mobileSampleStage
              )
              .map((sample) => {
                const nextDate =
                  sample['Follow-up Due'] ||
                  sample['Shipped On'] ||
                  sample['Requested On'];
                const dateInfo = formatDisplayDate(nextDate, currentDate);

                return (
                  <div
                    key={sample.SampleID || sample._row}
                    onClick={() => setSelectedSample(sample)}
                    className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs border-l-4 border-l-amber-500 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-stone-900 text-base">
                          {sample.Business}
                        </h4>
                        <div className="text-xs text-stone-500">
                          {sample.City ? `${sample.City} • ` : ''}
                          <span className="font-medium text-amber-700">
                            {sample.Stage}
                          </span>
                        </div>
                      </div>

                      {['Requested', 'Address confirmed'].includes(
                        (sample.Stage || '').trim()
                      ) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSampleToShip(sample);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-xl flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ship</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 flex flex-wrap items-center gap-3">
                      <span>Owner: {sample.Owner || 'Unassigned'}</span>
                      {nextDate && (
                        <span
                          className={
                            dateInfo.isLate
                              ? 'text-rose-600 font-semibold'
                              : 'text-stone-600'
                          }
                        >
                          {dateInfo.badge || dateInfo.formatted}
                        </span>
                      )}
                    </div>

                    {sample.Address && (
                      <div
                        className="pt-2 border-t border-stone-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            sample.Address
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          <span>Open on map</span>
                          <ExternalLink className="w-3 h-3 text-stone-400" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LEADS TAB                                                      */}
      {/* ============================================================== */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Mobile stage filter */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setMobileLeadStage('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                mobileLeadStage === 'All'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              All Stages
            </button>
            {leadStages.map((st) => (
              <button
                key={st}
                onClick={() => setMobileLeadStage(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  mobileLeadStage === st
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                {st} ({leadsByStage[st]?.length || 0})
              </button>
            ))}
          </div>

          {/* Grouped by Stage */}
          <div className="space-y-6">
            {leadStages.map((stage) => {
              const leadsInStage = leadsByStage[stage] || [];
              if (leadsInStage.length === 0 && mobileLeadStage !== 'All') return null;
              if (mobileLeadStage !== 'All' && mobileLeadStage !== stage) return null;

              return (
                <div key={stage} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        {stage}
                      </h3>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        {leadsInStage.length}
                      </span>
                    </div>
                  </div>

                  {leadsInStage.length === 0 ? (
                    <div className="bg-white/60 rounded-2xl p-4 text-center text-xs text-stone-400 italic border border-dashed border-stone-200">
                      No leads in {stage}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {leadsInStage.map((lead) => {
                        const dateInfo = formatDisplayDate(
                          lead['Next Step Date'],
                          currentDate
                        );

                        return (
                          <div
                            key={lead.LeadID || lead._row}
                            onClick={() => setSelectedLead(lead)}
                            className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-sky-400 cursor-pointer transition-all border-l-4 border-l-sky-500 space-y-2.5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-stone-900 text-sm">
                                  {lead.Business}
                                </h4>
                                {lead.City && (
                                  <span className="text-xs text-stone-500">
                                    {lead.City}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-stone-600 mt-2 space-y-1">
                                {lead.Contact && (
                                  <div>Contact: {lead.Contact}</div>
                                )}
                                <div className="text-stone-800">
                                  <span className="font-semibold text-stone-500">
                                    Next step:
                                  </span>{' '}
                                  {lead['Next Step'] || 'None defined'}
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                              <div className="text-[11px] text-stone-500">
                                {lead['Next Step Date'] ? (
                                  <span
                                    className={`font-mono ${
                                      dateInfo.isLate
                                        ? 'text-rose-600 font-semibold'
                                        : 'text-stone-600'
                                    }`}
                                  >
                                    Due: {dateInfo.badge || dateInfo.formatted}
                                  </span>
                                ) : (
                                  <span className="text-amber-600">Needs date</span>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogContactLead(lead);
                                  setLogNextStep(lead['Next Step'] || '');
                                  setLogNextStepDate(
                                    lead['Next Step Date'] || currentDate
                                  );
                                }}
                                className="px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors"
                              >
                                Log contact
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS & DRAWERS                                               */}
      {/* ============================================================== */}

      {/* Mark Shipped Modal */}
      <MarkShippedModal
        sample={sampleToShip}
        onClose={() => setSampleToShip(null)}
      />

      {/* Log Contact Modal for Lead */}
      {logContactLead && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 text-base">
                Log Contact with {logContactLead.Business}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Sets Last Contact = today ({currentDate}). Next step and date are required to keep deals moving.
              </p>
            </div>

            <form onSubmit={handleSaveLogContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                  New Next Step <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={logNextStep}
                  onChange={(e) => setLogNextStep(e.target.value)}
                  placeholder="e.g. Follow up on wholesale pricing..."
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                  Next Step Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={logNextStepDate}
                  onChange={(e) => setLogNextStepDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLogContactLead(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingContact || !logNextStep.trim() || !logNextStepDate}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-md disabled:opacity-50 transition-colors"
                >
                  {isLoggingContact ? 'Saving...' : 'Save & Log Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sample Modal */}
      {isAddSampleOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <h3 className="font-semibold text-stone-900 text-base">New Sample</h3>
              <button
                onClick={() => setIsAddSampleOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSample} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSampleBusiness}
                  onChange={(e) => setNewSampleBusiness(e.target.value)}
                  placeholder="e.g. Harrods Cafe"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newSampleCity}
                    onChange={(e) => setNewSampleCity(e.target.value)}
                    placeholder="e.g. London"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Owner
                  </label>
                  <select
                    value={newSampleOwner}
                    onChange={(e) => setNewSampleOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    {people.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Stage
                </label>
                <select
                  value={newSampleStage}
                  onChange={(e) => setNewSampleStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  {sampleStages.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreSample(!showMoreSample)}
                  className="text-xs text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1"
                >
                  {showMoreSample ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showMoreSample ? 'Fewer fields' : 'More fields (Contact, Phone, Address, Items)'}</span>
                </button>

                {showMoreSample && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Contact person"
                        value={newSampleContact}
                        onChange={(e) => setNewSampleContact(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={newSamplePhone}
                        onChange={(e) => setNewSamplePhone(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Full Address"
                      value={newSampleAddress}
                      onChange={(e) => setNewSampleAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Items to send (e.g. 2x Espresso, 1x Decaf)"
                      value={newSampleItems}
                      onChange={(e) => setNewSampleItems(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddSampleOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSample || !newSampleBusiness.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors"
                >
                  {isCreatingSample ? 'Creating...' : 'Create Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <h3 className="font-semibold text-stone-900 text-base">New Lead</h3>
              <button
                onClick={() => setIsAddLeadOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newLeadBusiness}
                  onChange={(e) => setNewLeadBusiness(e.target.value)}
                  placeholder="e.g. Artisan Roastery"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newLeadCity}
                    onChange={(e) => setNewLeadCity(e.target.value)}
                    placeholder="e.g. Manchester"
                    className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Owner
                  </label>
                  <select
                    value={newLeadOwner}
                    onChange={(e) => setNewLeadOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {people.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Stage
                </label>
                <select
                  value={newLeadStage}
                  onChange={(e) => setNewLeadStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                >
                  {leadStages.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreLead(!showMoreLead)}
                  className="text-xs text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1"
                >
                  {showMoreLead ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showMoreLead ? 'Fewer fields' : 'More fields (Contact, Phone, Next step)'}</span>
                </button>

                {showMoreLead && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Contact person"
                        value={newLeadContact}
                        onChange={(e) => setNewLeadContact(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={newLeadPhone}
                        onChange={(e) => setNewLeadPhone(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Next step..."
                        value={newLeadNextStep}
                        onChange={(e) => setNewLeadNextStep(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                      <input
                        type="date"
                        value={newLeadNextStepDate}
                        onChange={(e) => setNewLeadNextStepDate(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLead || !newLeadBusiness.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-md transition-colors"
                >
                  {isCreatingLead ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sample Detail Drawer */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-mono text-stone-500">
                  {selectedSample.SampleID || `#${selectedSample._row}`}
                </span>
                <h3 className="text-lg font-bold text-stone-900">
                  {selectedSample.Business}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSample(null)}
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
                    {selectedSample.Stage}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Owner
                  </div>
                  <div className="text-stone-900 font-semibold text-sm mt-0.5">
                    {selectedSample.Owner}
                  </div>
                </div>
              </div>

              {selectedSample.Address && (
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Address
                  </div>
                  <div className="text-stone-900 mt-0.5">
                    {selectedSample.Address}, {selectedSample.City}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      selectedSample.Address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-700 font-semibold mt-2 hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Open on Google Maps
                  </a>
                </div>
              )}

              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div>
                  <span className="text-stone-400">Contact:</span>{' '}
                  <span className="text-stone-800 font-medium">
                    {selectedSample.Contact || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Phone:</span>{' '}
                  <span className="text-stone-800 font-medium">
                    {selectedSample.Phone || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Items to send:</span>{' '}
                  <span className="text-stone-800 font-medium">
                    {selectedSample['Items To Send'] || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Tracking:</span>{' '}
                  <span className="font-mono text-stone-800">
                    {selectedSample.Tracking || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Outcome:</span>{' '}
                  <span className="text-stone-800">
                    {selectedSample.Outcome || 'Pending follow-up'}
                  </span>
                </div>
              </div>

              {selectedSample.Notes && (
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Notes
                  </div>
                  <p className="text-stone-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedSample.Notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              {['Requested', 'Address confirmed'].includes(
                (selectedSample.Stage || '').trim()
              ) && (
                <button
                  onClick={() => {
                    const sample = selectedSample;
                    setSelectedSample(null);
                    setSampleToShip(sample);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-2xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Truck className="w-4 h-4" />
                  <span>Mark Shipped</span>
                </button>
              )}
              <button
                onClick={() => setSelectedSample(null)}
                className="ml-auto px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-mono text-stone-500">
                  {selectedLead.LeadID || `#${selectedLead._row}`}
                </span>
                <h3 className="text-lg font-bold text-stone-900">
                  {selectedLead.Business}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
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
                    {selectedLead.Stage}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Owner
                  </div>
                  <div className="text-stone-900 font-semibold text-sm mt-0.5">
                    {selectedLead.Owner}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-2">
                <div>
                  <span className="text-stone-400">Contact:</span>{' '}
                  <span className="text-stone-800 font-medium">
                    {selectedLead.Contact || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Phone:</span>{' '}
                  <span className="text-stone-800 font-medium">
                    {selectedLead.Phone || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Last Contact:</span>{' '}
                  <span className="font-mono text-stone-800">
                    {selectedLead['Last Contact'] || 'Never'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-sky-50/70 border border-sky-200/70 rounded-2xl space-y-1">
                <div className="text-[11px] font-bold text-sky-900 uppercase">
                  Next Step Action
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  {selectedLead['Next Step'] || 'None'}
                </div>
                <div className="text-xs text-sky-800 font-mono">
                  Due: {selectedLead['Next Step Date'] || 'No date'}
                </div>
              </div>

              {selectedLead.Notes && (
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-stone-400 font-semibold uppercase text-[10px]">
                    Notes
                  </div>
                  <p className="text-stone-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedLead.Notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const lead = selectedLead;
                  setSelectedLead(null);
                  setLogContactLead(lead);
                  setLogNextStep(lead['Next Step'] || '');
                  setLogNextStepDate(lead['Next Step Date'] || currentDate);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-2xl text-xs flex items-center gap-1.5 shadow-md"
              >
                <span>Log Contact</span>
              </button>
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
