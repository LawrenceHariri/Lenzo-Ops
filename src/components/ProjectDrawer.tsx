/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flame,
  FolderGit2,
  Layers,
  Link,
  Loader2,
  MessageSquare,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { formatDisplayDate, today } from '../logic';
import { useOpsHub } from '../store';
import { CoachNoteRecord, ProjectRecord } from '../types';

interface ProjectDrawerProps {
  project: ProjectRecord | null;
  onClose: () => void;
  onStartOffRamp?: (projectName: string) => void;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  project,
  onClose,
  onStartOffRamp,
}) => {
  const { lists, tables, serverDate, updateRecord, showToast } = useOpsHub();
  const currentDate = today(serverDate);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [projectTitle, setProjectTitle] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('Active');
  const [priority, setPriority] = useState('Medium');
  const [nextAction, setNextAction] = useState('');
  const [inMyHead, setInMyHead] = useState('');
  const [dontRedo, setDontRedo] = useState('');
  const [whereItLives, setWhereItLives] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (project) {
      setProjectTitle(project.Project || '');
      setCategory(project.Category || '');
      setStatus(project.Status || 'Active');
      setPriority(project.Priority || 'Medium');
      setNextAction(project['Next Action'] || '');
      setInMyHead(project['In My Head'] || '');
      setDontRedo(project["Don't Redo"] || '');
      setWhereItLives(project['Where It Lives'] || '');
      setNotes(project.Notes || '');
      setIsEditing(false);
    }
  }, [project]);

  // Coach Notes for this project
  const projectNotes = useMemo(() => {
    if (!project) return [];
    return (tables['Coach Notes'] || []).filter(
      (n) => n.Project?.trim() === project.Project?.trim()
    );
  }, [tables['Coach Notes'], project]);

  if (!project) return null;

  // Freshness calculation
  const getFreshness = (lastSaved: string) => {
    if (!lastSaved || !/^\d{4}-\d{2}-\d{2}$/.test(lastSaved)) {
      return { color: 'bg-rose-500', text: 'Never saved', label: 'Stale' };
    }
    const p1 = lastSaved.split('-').map(Number);
    const p2 = currentDate.split('-').map(Number);
    const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
    const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return { color: 'bg-emerald-500', text: `Saved ${diffDays === 0 ? 'today' : 'yesterday'}`, label: 'Fresh' };
    } else if (diffDays <= 7) {
      return { color: 'bg-amber-500', text: `Saved ${diffDays} days ago`, label: 'Recent' };
    } else {
      return { color: 'bg-rose-500', text: `Saved ${diffDays} days ago`, label: 'Stale' };
    }
  };

  const freshness = getFreshness(project['Last Saved']);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setIsSaving(true);
    try {
      await updateRecord('Projects', project, {
        Project: projectTitle.trim(),
        Category: category.trim(),
        Status: status,
        Priority: priority,
        'Next Action': nextAction.trim(),
        'In My Head': inMyHead.trim(),
        "Don't Redo": dontRedo.trim(),
        'Where It Lives': whereItLives.trim(),
        Notes: notes.trim(),
      });
      showToast('Project updated successfully', 'success');
      setIsEditing(false);
    } catch {
      // Toast handles error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col min-w-0 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${freshness.color}`} />
                <span className="text-[11px] font-semibold text-stone-500">
                  {freshness.text}
                </span>
              </div>
              <h2 className="text-lg font-bold text-stone-900 truncate">
                {project.Project}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              {isEditing ? 'Cancel' : 'Edit Project'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick off-ramp trigger */}
          {onStartOffRamp && (
            <div className="p-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Off-Ramp Ready
                </div>
                <div className="text-xs text-stone-300">
                  Run evening coach brain dump for this project
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartOffRamp(project.Project);
                }}
                className="px-3.5 py-2 bg-white text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Start Off-Ramp</span>
              </button>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ops, Product..."
                    className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Waiting">Waiting</option>
                    <option value="Done">Done</option>
                    <option value="Dropped">Dropped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Next Action
                </label>
                <textarea
                  rows={2}
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Single concrete next step..."
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  In My Head
                </label>
                <textarea
                  rows={3}
                  value={inMyHead}
                  onChange={(e) => setInMyHead(e.target.value)}
                  placeholder="Distilled context and working thoughts..."
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  ⛔ Don&apos;t Redo
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={dontRedo}
                  onChange={(e) => setDontRedo(e.target.value)}
                  placeholder="Tried / decided already, and why..."
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Where It Lives
                </label>
                <input
                  type="text"
                  value={whereItLives}
                  onChange={(e) => setWhereItLives(e.target.value)}
                  placeholder="URL, Notion, Drive link, repo..."
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                  {project.Category || 'General'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {project.Status || 'Active'}
                </span>
                {project.Priority && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      project.Priority === 'High'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {project.Priority} Priority
                  </span>
                )}
                {project['Last Saved'] && (
                  <span className="text-[11px] font-mono text-stone-400 ml-auto">
                    Last Saved: {project['Last Saved']}
                  </span>
                )}
              </div>

              {/* Next Action Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Next Action
                </span>
                <p className="text-sm font-semibold text-stone-900 leading-snug">
                  {project['Next Action'] || 'No next action specified yet.'}
                </p>
              </div>

              {/* In My Head */}
              {project['In My Head'] && (
                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    In My Head
                  </span>
                  <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {project['In My Head']}
                  </p>
                </div>
              )}

              {/* Don't Redo */}
              {project["Don't Redo"] && (
                <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    ⛔ Don&apos;t Redo
                  </span>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    {project["Don't Redo"]}
                  </p>
                </div>
              )}

              {/* Where It Lives */}
              {project['Where It Lives'] && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Where It Lives
                  </span>
                  <div>
                    {project['Where It Lives'].startsWith('http') ? (
                      <a
                        href={project['Where It Lives']}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate">{project['Where It Lives']}</span>
                      </a>
                    ) : (
                      <p className="text-xs text-stone-700 font-medium">
                        {project['Where It Lives']}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {project.Notes && (
                <div className="p-4 bg-white rounded-2xl border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Notes
                  </span>
                  <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">
                    {project.Notes}
                  </p>
                </div>
              )}

              {/* Coach Notes Section */}
              <div className="pt-3 border-t border-stone-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Coach &amp; Claude Notes ({projectNotes.length})</span>
                  </h3>
                </div>

                {projectNotes.length === 0 ? (
                  <p className="text-xs text-stone-400 italic bg-stone-50 p-4 rounded-2xl border border-stone-100 text-center">
                    No notes logged for this project yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {projectNotes.map((note) => (
                      <div
                        key={note.NoteID || note._row}
                        className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                                note.From === 'Claude'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {note.From || 'Note'}
                            </span>
                            <span className="font-semibold text-stone-600">
                              {note.Type || 'Note'}
                            </span>
                          </div>
                          <span className="font-mono text-stone-400">
                            {note.Date}
                          </span>
                        </div>

                        <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
                          {note.Text}
                        </p>

                        {note.Answer && (
                          <div className="pt-2 border-t border-stone-200/60 text-xs text-stone-600">
                            <span className="font-semibold text-stone-700">Answer:</span>{' '}
                            {note.Answer}
                            {note['Answered On'] && (
                              <span className="ml-1 text-[11px] font-mono text-stone-400">
                                ({note['Answered On']})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
