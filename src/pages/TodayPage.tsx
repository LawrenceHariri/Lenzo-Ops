/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  Headphones,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Sparkles,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { MarkShippedModal } from '../components/MarkShippedModal';
import { QuickAddModal } from '../components/QuickAddModal';
import { SaveStateModal } from '../components/SaveStateModal';
import { TaskEditDrawer } from '../components/TaskEditDrawer';
import {
  agentsNeeding1on1,
  calculateSaveStreak,
  calculateTodayProgress,
  formatDisplayDate,
  getGreeting,
  getOneThing,
  leadsDue,
  openIssues,
  openSupport,
  overdueTasks,
  savedToday,
  sampleFollowUpsDue,
  samplesToShip,
  today,
  todayTasks,
} from '../logic';
import { useOpsHub } from '../store';
import { LeadRecord, SampleRecord, TaskRecord } from '../types';
import { fireTaskDoneConfetti } from '../utils/confetti';

interface TodayPageProps {
  onNavigateTab: (tab: 'tasks' | 'pipeline' | 'team' | 'partners' | 'support') => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({ onNavigateTab }) => {
  const {
    tables,
    serverDate,
    refresh,
    isRefreshing,
    lastSynced,
    updateRecord,
    showToast,
  } = useOpsHub();

  const currentDate = today(serverDate);
  const nowHour = new Date().getHours();

  // State modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<TaskRecord | null>(null);
  const [sampleToShip, setSampleToShip] = useState<SampleRecord | null>(null);
  const [saveStateOpen, setSaveStateOpen] = useState(false);

  // Call outcome modal for sample follow-up
  const [callDoneSample, setCallDoneSample] = useState<SampleRecord | null>(null);
  const [callOutcome, setCallOutcome] = useState('');
  const [isSavingCallOutcome, setIsSavingCallOutcome] = useState(false);

  // Collapsible section states (all open by default)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overdue: true,
    todayTasks: true,
    sampleFollowups: true,
    samplesToShip: true,
    leadsDue: true,
    agents1on1: true,
    issuesAndSupport: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Data calculations
  const overdue = overdueTasks(tables.Tasks, currentDate);
  const dueTodayTasks = todayTasks(tables.Tasks, currentDate);
  const followUpsDue = sampleFollowUpsDue(tables.Samples, currentDate);
  const toShip = samplesToShip(tables.Samples);
  const leads = leadsDue(tables.Leads, currentDate);
  const agents1on1 = agentsNeeding1on1(tables.Agents, currentDate);
  const partnerIssues = openIssues(tables['Partner Issues']);
  const supportTickets = openSupport(tables.Support);

  const progress = calculateTodayProgress(tables.Tasks, currentDate);
  const oneThing = getOneThing(tables.Tasks, tables.Samples, currentDate);
  const isSavedToday = savedToday(tables['Save State'], currentDate);
  const streak = calculateSaveStreak(tables['Save State'], currentDate);

  const formattedDate = formatDisplayDate(currentDate).formatted;
  const greeting = getGreeting('Lourans');

  // Handle task checkbox toggle
  const handleToggleTask = async (task: TaskRecord) => {
    const newStatus = task.Status === 'Done' ? 'Open' : 'Done';
    try {
      await updateRecord('Tasks', task, { Status: newStatus });
      if (newStatus === 'Done') {
        fireTaskDoneConfetti();
        showToast('Nice. One less thing.', 'success');
      } else {
        showToast('Task reopened', 'info');
      }
    } catch {
      // Toast handles error
    }
  };

  // Handle "Call done" button for Sample follow-up
  const handleCallDoneClick = (sample: SampleRecord) => {
    setCallDoneSample(sample);
    setCallOutcome(sample.Outcome || '');
  };

  const handleSaveCallDone = async () => {
    if (!callDoneSample) return;
    setIsSavingCallOutcome(true);
    try {
      await updateRecord('Samples', callDoneSample, {
        Stage: 'Follow-up done',
        'Follow-up Done On': currentDate,
        Outcome: callOutcome.trim(),
      });
      fireTaskDoneConfetti();
      showToast('Follow-up call logged! Great work.', 'success');
      setCallDoneSample(null);
      setCallOutcome('');
    } catch {
      // Toast handles error
    } finally {
      setIsSavingCallOutcome(false);
    }
  };

  // Handle One Thing completion
  const handleCompleteOneThing = async () => {
    if (!oneThing) return;
    if (oneThing.type === 'task') {
      await handleToggleTask(oneThing.record);
    } else {
      handleCallDoneClick(oneThing.record);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-stone-400 text-xs font-medium uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Here is your operational focus for today. Breathe and take them one at a time.
          </p>
        </div>

        {/* Circular Progress Indicator */}
        <div className="flex items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100 shrink-0">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-stone-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-500 ease-out"
                strokeDasharray={`${progress.percentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-bold text-xs text-stone-800">
              {progress.percentage}%
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold text-stone-900">
              {progress.done} of {progress.total} done
            </div>
            <div className="text-[11px] text-stone-500">
              {progress.total === 0
                ? 'No tasks due today'
                : progress.done === progress.total
                ? 'All caught up! 🎉'
                : 'Tasks due today + overdue'}
            </div>
          </div>
        </div>
      </section>

      {/* "Your One Thing" Card */}
      {oneThing ? (
        <section className="bg-gradient-to-br from-amber-50/70 via-white to-stone-50 rounded-3xl p-6 sm:p-7 border-2 border-amber-300 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-xs">
                ★
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Your one thing right now
              </span>
            </div>
            <span className="text-xs font-medium text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
              {oneThing.reason}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                {oneThing.type === 'task'
                  ? oneThing.record.Task
                  : `Follow-up call with ${oneThing.record.Business || 'Client'}`}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                {oneThing.type === 'task' ? (
                  <>
                    <span className="font-semibold text-stone-700">
                      Owner: {oneThing.record.Owner}
                    </span>
                    <span>•</span>
                    <span className="text-stone-500">
                      Due: {formatDisplayDate(oneThing.record.Due, currentDate).formatted}
                    </span>
                    {oneThing.record.Area && (
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-medium">
                        {oneThing.record.Area}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span>Contact: {oneThing.record.Contact || 'None'}</span>
                    <span>•</span>
                    <span>Phone: {oneThing.record.Phone || 'None'}</span>
                    {oneThing.record.City && <span>({oneThing.record.City})</span>}
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleCompleteOneThing}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold bg-stone-900 hover:bg-black text-white shadow-md transition-all active:scale-95 shrink-0"
            >
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
              <span>Done</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-3xl p-6 border border-stone-200/80 text-center">
          <div className="text-3xl mb-1">🎉</div>
          <h2 className="text-base font-semibold text-stone-800">
            No urgent one thing!
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            You are completely on top of overdue tasks and urgent follow-ups.
          </p>
        </section>
      )}

      {/* Sections in Exact Required Order:
          a) Overdue tasks
          b) Due today
          c) Sample follow-up calls due
          d) Samples waiting to ship
          e) Lead next steps due
          f) Agents who need a 1:1
          g) Open partner issues & support tickets
      */}

      {/* a) Overdue tasks */}
      {overdue.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('overdue')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Overdue tasks
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {overdue.length}
              </span>
            </div>
            {openSections.overdue ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.overdue && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {overdue.map((task) => {
                const dateInfo = formatDisplayDate(task.Due, currentDate);
                return (
                  <div
                    key={task.TaskID || task._row}
                    className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-indigo-500"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Round checkbox */}
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="mt-0.5 w-5 h-5 rounded-full border-2 border-stone-300 hover:border-indigo-600 flex items-center justify-center shrink-0 transition-colors"
                        aria-label="Mark task done"
                      >
                        {task.Status === 'Done' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        )}
                      </button>

                      <div
                        onClick={() => setSelectedTaskToEdit(task)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {task.Task}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                          <span className="font-mono text-rose-600 font-semibold">
                            {dateInfo.badge}
                          </span>
                          <span>•</span>
                          <span>{task.Owner}</span>
                          {task.Priority === 'High' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              High
                            </span>
                          )}
                          {task.Area && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {task.Area}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* b) Due today */}
      {dueTodayTasks.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('todayTasks')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Due today
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {dueTodayTasks.length}
              </span>
            </div>
            {openSections.todayTasks ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.todayTasks && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {dueTodayTasks.map((task) => (
                <div
                  key={task.TaskID || task._row}
                  className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-indigo-500"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 w-5 h-5 rounded-full border-2 border-stone-300 hover:border-indigo-600 flex items-center justify-center shrink-0 transition-colors"
                      aria-label="Mark task done"
                    >
                      {task.Status === 'Done' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      )}
                    </button>

                    <div
                      onClick={() => setSelectedTaskToEdit(task)}
                      className="cursor-pointer flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {task.Task}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span>{task.Owner}</span>
                        {task.Priority && (
                          <span>• Priority: {task.Priority}</span>
                        )}
                        {task.Area && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {task.Area}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* c) Sample follow-up calls due */}
      {followUpsDue.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('sampleFollowups')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Sample follow-up calls due
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {followUpsDue.length}
              </span>
            </div>
            {openSections.sampleFollowups ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.sampleFollowups && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {followUpsDue.map((sample) => (
                <div
                  key={sample.SampleID || sample._row}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-amber-500"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">
                        {sample.Business}
                      </span>
                      {sample.City && (
                        <span className="text-xs text-stone-500 font-normal">
                          ({sample.City})
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Follow-up due: {sample['Follow-up Due']}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-2">
                      {sample.Contact && <span>Contact: {sample.Contact}</span>}
                      {sample.Phone && (
                        <a
                          href={`tel:${sample.Phone}`}
                          className="text-amber-700 font-medium hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {sample.Phone}
                        </a>
                      )}
                      <span>• Owner: {sample.Owner}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCallDoneClick(sample)}
                    className="self-start sm:self-auto px-4 py-2 rounded-2xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call done</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* d) Samples waiting to ship */}
      {toShip.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('samplesToShip')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Samples waiting to ship
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {toShip.length}
              </span>
            </div>
            {openSections.samplesToShip ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.samplesToShip && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {toShip.map((sample) => (
                <div
                  key={sample.SampleID || sample._row}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-amber-500"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">
                        {sample.Business}
                      </span>
                      <span className="text-xs text-stone-500">
                        {sample.City ? `(${sample.City})` : ''}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-stone-100 text-stone-600">
                        {sample.Stage}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-2">
                      {sample['Items To Send'] && (
                        <span>Items: {sample['Items To Send']}</span>
                      )}
                      <span>• Owner: {sample.Owner || 'Unassigned'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSampleToShip(sample)}
                    className="self-start sm:self-auto px-4 py-2 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mark shipped</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* e) Lead next steps due */}
      {leads.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('leadsDue')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-sky-600" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Lead next steps due
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {leads.length}
              </span>
            </div>
            {openSections.leadsDue ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.leadsDue && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {leads.map((lead) => {
                const dateInfo = formatDisplayDate(lead['Next Step Date'], currentDate);
                return (
                  <div
                    key={lead.LeadID || lead._row}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-sky-500"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-900">
                          {lead.Business}
                        </span>
                        {lead.City && (
                          <span className="text-xs text-stone-500">({lead.City})</span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          {lead.Stage}
                        </span>
                      </div>
                      <div className="text-xs text-stone-700 mt-1">
                        <span className="font-medium">Next step:</span>{' '}
                        {lead['Next Step'] || 'Needs a next step'}
                        {lead['Next Step Date'] && (
                          <span
                            className={`ml-2 font-mono font-semibold ${
                              dateInfo.isLate ? 'text-rose-600' : 'text-stone-500'
                            }`}
                          >
                            ({dateInfo.badge || dateInfo.formatted})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab('pipeline')}
                      className="self-start sm:self-auto text-xs px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
                    >
                      View in Pipeline →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* f) Agents who need a 1:1 */}
      {agents1on1.length > 0 && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('agents1on1')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Agents who need a 1:1
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {agents1on1.length}
              </span>
            </div>
            {openSections.agents1on1 ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.agents1on1 && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {agents1on1.map((agent) => (
                <div
                  key={agent.AgentID || agent._row}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-emerald-500"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">
                        {agent.Name}
                      </span>
                      {agent['Based In'] && (
                        <span className="text-xs text-stone-500">
                          ({agent['Based In']})
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {agent.Stage}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      Next 1:1:{' '}
                      <span className="font-mono font-semibold text-stone-700">
                        {agent['Next 1:1'] || 'Not scheduled'}
                      </span>
                      {agent['Last 1:1'] && (
                        <span className="ml-2 text-stone-400">
                          (Last: {agent['Last 1:1']})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateTab('team')}
                    className="self-start sm:self-auto text-xs px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition-colors"
                  >
                    Log 1:1 on Team →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* g) Open partner issues and open support tickets (compact list) */}
      {(partnerIssues.length > 0 || supportTickets.length > 0) && (
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('issuesAndSupport')}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Headphones className="w-4 h-4 text-rose-600" />
              <h3 className="font-semibold text-stone-900 text-sm">
                Open partner issues &amp; support tickets
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {partnerIssues.length + supportTickets.length}
              </span>
            </div>
            {openSections.issuesAndSupport ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>

          {openSections.issuesAndSupport && (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {partnerIssues.map((issue) => (
                <div
                  key={issue.IssueID || issue._row}
                  className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-violet-500"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-stone-900">
                        {issue.Partner}:
                      </span>
                      <span className="text-stone-700 truncate">{issue.Issue}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Status: {issue.Status} • Next step: {issue['Next Step'] || 'None'}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('partners')}
                    className="text-xs px-2.5 py-1 text-violet-700 hover:text-violet-900 font-semibold"
                  >
                    View →
                  </button>
                </div>
              ))}

              {supportTickets.map((ticket) => (
                <div
                  key={ticket.TicketID || ticket._row}
                  className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-rose-500"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-stone-900">
                        {ticket.Customer}:
                      </span>
                      <span className="text-stone-700 truncate">{ticket.Issue}</span>
                    </div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Channel: {ticket.Channel} • Status: {ticket.Status}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('support')}
                    className="text-xs px-2.5 py-1 text-rose-700 hover:text-rose-900 font-semibold"
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* End-of-day Card:
          if savedToday is false and it's after 17:00, show "Save your state (60 sec)".
          Show streak: number of consecutive days with a Save State row.
      */}
      {!isSavedToday && nowHour >= 17 && (
        <section className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                End of Day Reflection
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-200 bg-amber-900/60 px-2 py-0.5 rounded-full font-mono">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                {streak} day streak
              </span>
            </div>
            <h3 className="text-lg font-bold">
              Save your state (60 sec)
            </h3>
            <p className="text-xs text-stone-300">
              Clear tomorrow&apos;s next action and brain dump so you can switch off completely tonight.
            </p>
          </div>

          <button
            onClick={() => setSaveStateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-white text-stone-900 hover:bg-stone-100 shadow-md transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Save state now</span>
          </button>
        </section>
      )}

      {/* Sticky Bottom-Right "+ Quick Add" Button */}
      <div className="fixed bottom-20 md:bottom-8 right-6 z-40">
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-stone-900 hover:bg-black text-white text-sm font-semibold shadow-xl hover:shadow-2xl transition-all active:scale-95"
          aria-label="Quick add task"
        >
          <Plus className="w-5 h-5 text-indigo-400 stroke-[3]" />
          <span>Quick add</span>
        </button>
      </div>

      {/* Call Outcome Modal for Sample Follow-up */}
      {callDoneSample && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 text-base">
                Follow-up with {callDoneSample.Business}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Stage will be set to &quot;Follow-up done&quot; and Follow-up Done On = {currentDate}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                What was the outcome?
              </label>
              <input
                type="text"
                autoFocus
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                placeholder="e.g. Loved sample, ordered 50 units, sent quote..."
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCallDoneSample(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingCallOutcome}
                onClick={handleSaveCallDone}
                className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors"
              >
                {isSavingCallOutcome ? 'Saving...' : 'Confirm Call Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />

      <TaskEditDrawer
        task={selectedTaskToEdit}
        onClose={() => setSelectedTaskToEdit(null)}
      />

      <MarkShippedModal
        sample={sampleToShip}
        onClose={() => setSampleToShip(null)}
      />

      <SaveStateModal
        isOpen={saveStateOpen}
        onClose={() => setSaveStateOpen(false)}
      />
    </div>
  );
};
