/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { formatDisplayDate, isOpenTask, today } from '../logic';
import { useOpsHub } from '../store';
import { AgentRecord, TrainingRecord } from '../types';

export const TeamPage: React.FC = () => {
  const { tables, serverDate, createRecord, updateRecord, showToast } =
    useOpsHub();
  const currentDate = today(serverDate);

  // Modals
  const [log1on1Agent, setLog1on1Agent] = useState<AgentRecord | null>(null);
  const [next1on1Date, setNext1on1Date] = useState('');
  const [isLogging1on1, setIsLogging1on1] = useState(false);

  const [addTrainingAgent, setAddTrainingAgent] = useState<AgentRecord | null>(
    null
  );
  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingResult, setTrainingResult] = useState('');
  const [trainingFollowUp, setTrainingFollowUp] = useState('');
  const [trainingNotesLink, setTrainingNotesLink] = useState('');
  const [isAddingTraining, setIsAddingTraining] = useState(false);

  // Handle Log 1:1
  const handleSave1on1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!log1on1Agent) return;
    if (!next1on1Date.trim()) {
      showToast('Next 1:1 date is required', 'error');
      return;
    }

    setIsLogging1on1(true);
    try {
      await updateRecord('Agents', log1on1Agent, {
        'Last 1:1': currentDate,
        'Next 1:1': next1on1Date.trim(),
      });

      showToast(`1:1 logged for ${log1on1Agent.Name}! Next session scheduled.`, 'success');
      setLog1on1Agent(null);
      setNext1on1Date('');
    } catch {
      // Toast handles error
    } finally {
      setIsLogging1on1(false);
    }
  };

  // Handle Add Training
  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTrainingAgent) return;
    if (!trainingTopic.trim()) {
      showToast('Training topic is required', 'error');
      return;
    }

    setIsAddingTraining(true);
    try {
      await createRecord('Trainings', {
        Date: currentDate,
        Agent: addTrainingAgent.Name,
        Topic: trainingTopic.trim(),
        Result: trainingResult.trim(),
        'Follow-up': trainingFollowUp.trim(),
        'Notes Link': trainingNotesLink.trim(),
      });

      showToast(`Training record added for ${addTrainingAgent.Name}`, 'success');
      setAddTrainingAgent(null);
      setTrainingTopic('');
      setTrainingResult('');
      setTrainingFollowUp('');
      setTrainingNotesLink('');
    } catch {
      // Toast handles error
    } finally {
      setIsAddingTraining(false);
    }
  };

  const agents = tables.Agents || [];

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Team
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Agent development, 1:1 rhythms, and training track records
          </p>
        </div>

        <div className="text-xs text-stone-500 bg-white px-3.5 py-1.5 rounded-2xl border border-stone-200 font-medium self-start sm:self-auto">
          {agents.length} active agents
        </div>
      </div>

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs">
          <div className="text-3xl mb-2">👥</div>
          <h3 className="font-semibold text-stone-900 text-base">No agents found</h3>
          <p className="text-xs text-stone-500 mt-1">
            Agents sync from the Google Sheet &quot;Agents&quot; tab.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {agents.map((agent) => {
            // Find agent's open tasks
            const agentTasks = (tables.Tasks || []).filter(
              (t) =>
                isOpenTask(t) &&
                (t.Owner || '').trim().toLowerCase() ===
                  (agent.Name || '').trim().toLowerCase()
            );

            // Find agent's trainings (newest first)
            const agentTrainings = (tables.Trainings || [])
              .filter(
                (tr) =>
                  (tr.Agent || '').trim().toLowerCase() ===
                  (agent.Name || '').trim().toLowerCase()
              )
              .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));

            const next1on1Info = formatDisplayDate(agent['Next 1:1'], currentDate);

            return (
              <div
                key={agent.AgentID || agent._row}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-xs border-l-4 border-l-emerald-500 space-y-6"
              >
                {/* Agent Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-stone-900">
                        {agent.Name}
                      </h3>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {agent.Stage || 'Active'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                      {agent['Based In'] && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          {agent['Based In']}
                        </span>
                      )}
                      {agent.Email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          {agent.Email}
                        </span>
                      )}
                      {agent.Languages && (
                        <span>Languages: {agent.Languages}</span>
                      )}
                    </div>
                  </div>

                  {/* Level & Latest Score chips */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {agent['Current Level'] && (
                      <div className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Level: {agent['Current Level']}</span>
                      </div>
                    )}
                    {agent['Latest Score'] && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 font-mono">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Score: {agent['Latest Score']}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 1:1 Rhythms & Action buttons */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 font-medium">Last 1:1:</span>{' '}
                      <span className="font-mono text-stone-700 font-semibold">
                        {agent['Last 1:1']
                          ? formatDisplayDate(agent['Last 1:1']).formatted
                          : 'Never'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 font-medium">Next 1:1:</span>{' '}
                      <span
                        className={`font-mono font-semibold ${
                          next1on1Info.isLate
                            ? 'text-rose-600'
                            : 'text-stone-800'
                        }`}
                      >
                        {next1on1Info.badge || next1on1Info.formatted}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setLog1on1Agent(agent);
                        setNext1on1Date(agent['Next 1:1'] || '');
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Log 1:1</span>
                    </button>

                    <button
                      onClick={() => setAddTrainingAgent(agent)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Add training</span>
                    </button>
                  </div>
                </div>

                {/* "Your commitments to them" highlighted soft yellow box */}
                {agent['Your Commitments'] && (
                  <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                      <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                      <span>Your commitments to them (never forget)</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap font-medium">
                      {agent['Your Commitments']}
                    </p>
                  </div>
                )}

                {/* 3 short blocks: Strengths, Working On, Blockers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Strengths</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {agent.Strengths || 'Not noted yet'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-indigo-600" />
                      <span>Working On</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {agent['Working On'] || 'None recorded'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      <span>Blockers</span>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">
                      {agent.Blockers || 'No active blockers'}
                    </p>
                  </div>
                </div>

                {/* Agent's Open Tasks */}
                {agentTasks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                      <span>Open Tasks assigned to {agent.Name}</span>
                      <span className="font-mono text-[10px] px-2 py-0.2 bg-stone-100 rounded-full text-stone-600">
                        {agentTasks.length}
                      </span>
                    </div>
                    <div className="divide-y divide-stone-100 border border-stone-200/80 rounded-2xl overflow-hidden bg-stone-50/50">
                      {agentTasks.map((t) => (
                        <div
                          key={t.TaskID || t._row}
                          className="p-3 px-4 flex items-center justify-between text-xs hover:bg-white transition-colors"
                        >
                          <span className="font-medium text-stone-800">
                            {t.Task}
                          </span>
                          <span className="text-stone-400 font-mono text-[11px]">
                            Due: {t.Due || 'No date'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent's Trainings (newest first) */}
                {agentTrainings.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                      <span>Training History</span>
                      <span className="font-mono text-[10px] px-2 py-0.2 bg-stone-100 rounded-full text-stone-600">
                        {agentTrainings.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {agentTrainings.map((tr) => (
                        <div
                          key={tr.TrainingID || tr._row}
                          className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900">
                                {tr.Topic}
                              </span>
                              <span className="font-mono text-[11px] text-stone-400">
                                {tr.Date}
                              </span>
                            </div>
                            <div className="text-stone-500 mt-0.5">
                              Result: {tr.Result || 'Completed'}
                              {tr['Follow-up'] && (
                                <span> • Follow-up: {tr['Follow-up']}</span>
                              )}
                            </div>
                          </div>

                          {tr['Notes Link'] && (
                            <a
                              href={tr['Notes Link']}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 self-start sm:self-auto"
                            >
                              <span>Notes</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log 1:1 Modal */}
      {log1on1Agent && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-semibold text-stone-900 text-base">
                Log 1:1 with {log1on1Agent.Name}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Sets Last 1:1 = today ({currentDate}). Next 1:1 is required to keep continuity.
              </p>
            </div>

            <form onSubmit={handleSave1on1} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                  Next 1:1 Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  autoFocus
                  value={next1on1Date}
                  onChange={(e) => setNext1on1Date(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLog1on1Agent(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLogging1on1 || !next1on1Date.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors"
                >
                  {isLogging1on1 ? 'Saving...' : 'Save & Log 1:1'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Training Modal */}
      {addTrainingAgent && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-semibold text-stone-900 text-base">
                Add Training for {addTrainingAgent.Name}
              </h3>
              <button
                onClick={() => setAddTrainingAgent(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTraining} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={trainingTopic}
                  onChange={(e) => setTrainingTopic(e.target.value)}
                  placeholder="e.g. Objections Handling, Espresso Extraction..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Result
                </label>
                <input
                  type="text"
                  value={trainingResult}
                  onChange={(e) => setTrainingResult(e.target.value)}
                  placeholder="e.g. Passed evaluation, Needs 1 more session..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Follow-up Action
                </label>
                <input
                  type="text"
                  value={trainingFollowUp}
                  onChange={(e) => setTrainingFollowUp(e.target.value)}
                  placeholder="e.g. Shadow Lourans on Friday..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Notes Link (opens in new tab)
                </label>
                <input
                  type="url"
                  value={trainingNotesLink}
                  onChange={(e) => setTrainingNotesLink(e.target.value)}
                  placeholder="https://docs.google.com/..."
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setAddTrainingAgent(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingTraining || !trainingTopic.trim()}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
                >
                  {isAddingTraining ? 'Saving...' : 'Add Training'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
