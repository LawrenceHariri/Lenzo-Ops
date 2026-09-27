/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Flame,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
  X,
} from 'lucide-react';
import { callOffRampCoach, CoachChatMessage } from '../coachApi';
import { calculateSaveStreak, today } from '../logic';
import { useOpsHub } from '../store';
import { CoachNoteRecord, SaveStateRecord } from '../types';

interface SaveStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialProject?: string;
}

interface ParsedCardResult {
  done: boolean;
  next_action?: string;
  in_my_head?: string;
  dont_redo?: string;
  energy?: string;
  priority?: string;
  new_tasks?: string[];
  claude_answers?: { note_id: string; answer: string }[];
  summary_for_claude?: string;
}

export const SaveStateModal: React.FC<SaveStateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProject,
}) => {
  const { lists, tables, serverDate, createRecord, updateRecord, showToast } =
    useOpsHub();
  const currentDate = today(serverDate);

  const areas = lists.Area || ['Ops', 'Growth', 'Admin', 'Product', 'Team'];

  // Energy options - ensure 4 items with emojis
  const energyOptions = useMemo(() => {
    const rawList = lists.Energy?.length
      ? lists.Energy
      : ['High', 'Medium', 'Low', 'Exhausted'];

    return rawList.slice(0, 4).map((item) => {
      const lower = item.toLowerCase();
      let emoji = '⚡';
      if (lower.includes('high') || lower.includes('energized')) emoji = '⚡';
      else if (lower.includes('med') || lower.includes('balanced')) emoji = '🔋';
      else if (lower.includes('low') || lower.includes('drained')) emoji = '🪫';
      else if (lower.includes('exhaust') || lower.includes('tired')) emoji = '😴';

      const cleanLabel = item.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || item;
      return { value: item, label: cleanLabel, emoji };
    });
  }, [lists.Energy]);

  // Projects list: Active first, then Waiting, then others
  const availableProjects = useMemo(() => {
    const projects = tables.Projects || [];
    if (projects.length > 0) {
      const sorted = [...projects].sort((a, b) => {
        const order: Record<string, number> = { Active: 1, Waiting: 2, Done: 3, Dropped: 4 };
        const oA = order[a.Status] || 5;
        const oB = order[b.Status] || 5;
        return oA - oB;
      });
      return Array.from(new Set(sorted.map((p) => p.Project).filter(Boolean)));
    }
    return areas;
  }, [tables.Projects, areas]);

  const [mode, setMode] = useState<'coach' | 'quick'>('coach');
  const [selectedProject, setSelectedProject] = useState(
    initialProject || availableProjects[0] || 'Ops'
  );

  useEffect(() => {
    if (initialProject && availableProjects.includes(initialProject)) {
      setSelectedProject(initialProject);
    }
  }, [initialProject, availableProjects]);

  // Quick Save fields
  const [quickNextAction, setQuickNextAction] = useState('');

  // Coach Stage: 'dump' | 'chat' | 'preview'
  const [coachStep, setCoachStep] = useState<'dump' | 'chat' | 'preview'>('dump');
  const [brainDump, setBrainDump] = useState('');
  const [chatMessages, setChatMessages] = useState<CoachChatMessage[]>([]);
  const [userChatInput, setUserChatInput] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [roundCount, setRoundCount] = useState(0);

  // Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Resulting preview fields
  const [previewNextAction, setPreviewNextAction] = useState('');
  const [previewInMyHead, setPreviewInMyHead] = useState('');
  const [previewDontRedo, setPreviewDontRedo] = useState('');
  const [previewEnergy, setPreviewEnergy] = useState(() => energyOptions[0]?.value || 'Medium');
  const [previewPriority, setPreviewPriority] = useState<string>('Medium');
  const [previewTasks, setPreviewTasks] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [previewClaudeAnswers, setPreviewClaudeAnswers] = useState<
    { note_id: string; answer: string; question?: string }[]
  >([]);
  const [previewSummaryForClaude, setPreviewSummaryForClaude] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Streak
  const currentStreak = calculateSaveStreak(tables['Save State'], currentDate);

  // System prompt from Coach Config
  const systemPrompt = useMemo(() => {
    const configRow = (tables['Coach Config'] || []).find(
      (c) => c.Key === 'system_prompt'
    );
    if (configRow?.Value && configRow.Value.trim()) {
      return configRow.Value.trim();
    }
    // Reliable default if Coach Config not populated in Sheet yet
    return `You are the Lenzo Ops Hub Off-Ramp Coach. Guide the founder through an evening brain dump and interview to clarify their state.
Help them turn raw thoughts into a single next action, distilled context for 'In My Head', lessons for 'Don't Redo', an energy rating, and explicit action items for their task list. Answer any open Claude questions.
Keep answers brief and conversational (1-3 sentences).
When finished (or by round 4), output a JSON block:
{
  "done": true,
  "next_action": "The single highest leverage next action for tomorrow morning",
  "in_my_head": "Distilled context and lingering loose ends",
  "dont_redo": "Mistake or dead-end to avoid repeating (max 200 chars)",
  "energy": "High | Medium | Low | Exhausted",
  "new_tasks": ["Task 1", "Task 2"],
  "claude_answers": [{ "note_id": "NoteID", "answer": "Answer text" }],
  "summary_for_claude": "Short summary of state and decisions today"
}`;
  }, [tables['Coach Config']]);

  // Current card for selected project
  const currentCard = useMemo(() => {
    const pRow = (tables.Projects || []).find(
      (p) => (p.Project || p.Name) === selectedProject
    );
    if (pRow) {
      return {
        'Next Action': pRow['Next Action'] || '',
        'In My Head': pRow['In My Head'] || '',
        "Don't Redo": pRow["Don't Redo"] || '',
      };
    }
    const ssRow = (tables['Save State'] || []).find(
      (r) => r.Area === selectedProject
    );
    if (ssRow) {
      return {
        'Next Action': ssRow['Next Action'] || '',
        'In My Head': ssRow['In My Head'] || '',
        "Don't Redo": ssRow["Don't Redo"] || '',
      };
    }
    return null;
  }, [tables.Projects, tables['Save State'], selectedProject]);

  // Open Claude questions for this project
  const openClaudeQuestions = useMemo(() => {
    return (tables['Coach Notes'] || []).filter(
      (n) =>
        n.From === 'Claude' &&
        n.Type === 'Question' &&
        n.Status === 'Open' &&
        (!n.Project || n.Project === selectedProject)
    );
  }, [tables['Coach Notes'], selectedProject]);

  // Speech-to-text toggle
  const toggleSpeechRecognition = (target: 'dump' | 'chat') => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser.', 'info');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) {
          if (target === 'dump') {
            setBrainDump((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          } else {
            setUserChatInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Helper to extract JSON from Gemini reply
  const extractDoneJson = (text: string): ParsedCardResult | null => {
    try {
      // Find JSON block with "done": true
      const jsonMatch = text.match(/\{[\s\S]*"done"\s*:\s*true[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.done === true) {
          return parsed;
        }
      }
    } catch {
      // Not JSON yet
    }
    return null;
  };

  // Transition to preview when done
  const handleTransitionToPreview = (data: ParsedCardResult) => {
    setPreviewNextAction(data.next_action || currentCard?.['Next Action'] || '');
    setPreviewInMyHead(data.in_my_head || brainDump);
    setPreviewDontRedo(data.dont_redo?.slice(0, 200) || '');
    if (data.energy) {
      setPreviewEnergy(data.energy);
    }
    if (data.priority && ['High', 'Medium', 'Low'].includes(data.priority)) {
      setPreviewPriority(data.priority);
    }
    setPreviewTasks(Array.isArray(data.new_tasks) ? data.new_tasks : []);

    // Match Claude answers
    const answersWithQuestions = (data.claude_answers || []).map((ans) => {
      const note = openClaudeQuestions.find(
        (q) => String(q.NoteID || q._row) === String(ans.note_id)
      );
      return {
        note_id: ans.note_id,
        answer: ans.answer,
        question: note?.Text || `Question #${ans.note_id}`,
      };
    });
    setPreviewClaudeAnswers(answersWithQuestions);
    setPreviewSummaryForClaude(
      data.summary_for_claude || 'Session completed with Ops Hub Coach.'
    );

    setCoachStep('preview');
  };

  // Step 1: Start Coach Chat from initial brain dump
  const handleStartCoachChat = async () => {
    if (!brainDump.trim()) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    setIsCoachThinking(true);
    setCoachError(null);

    // Initial message format as specified:
    // the project name, current card, open coach notes for this project where From = "Claude" and Type = "Question", and the dump.
    const initialUserMessage = `Project: ${selectedProject}

Current Card:
- Next Action: ${currentCard?.['Next Action'] || 'None'}
- In My Head: ${currentCard?.['In My Head'] || 'None'}
- Don't Redo: ${currentCard?.["Don't Redo"] || 'None'}

Open Claude Questions:
${
  openClaudeQuestions.length > 0
    ? openClaudeQuestions
        .map((q) => `- [NoteID: ${q.NoteID || q._row}]: ${q.Text}`)
        .join('\n')
    : 'None'
}

Founder Brain Dump:
${brainDump.trim()}`;

    const newHistory: CoachChatMessage[] = [
      { role: 'user', content: initialUserMessage },
    ];
    setChatMessages(newHistory);
    setCoachStep('chat');
    setRoundCount(1);

    try {
      const reply = await callOffRampCoach(systemPrompt, newHistory);
      const parsedJson = extractDoneJson(reply);

      if (parsedJson) {
        handleTransitionToPreview(parsedJson);
      } else {
        setChatMessages([...newHistory, { role: 'model', content: reply }]);
      }
    } catch (err: any) {
      console.error('Coach failed:', err);
      setCoachError('Gemini call failed. Falling back to Quick save.');
      setMode('quick');
      setQuickNextAction(brainDump.slice(0, 100));
      showToast('Coach offline. Switched to Quick save.', 'error');
    } finally {
      setIsCoachThinking(false);
    }
  };

  // Step 2: Handle ongoing chat reply
  const handleSendChatReply = async () => {
    if (!userChatInput.trim() || isCoachThinking) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const nextRounds = roundCount + 1;
    setRoundCount(nextRounds);

    let messageToSend = userChatInput.trim();
    // Max 4 rounds rule: if round >= 4, instruct Gemini to finalize
    if (nextRounds >= 4) {
      messageToSend += '\n\n(We have reached the maximum 4 rounds. Please finalize and output the JSON card with done: true.)';
    }

    const updatedMessages: CoachChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: messageToSend },
    ];
    setChatMessages(updatedMessages);
    setUserChatInput('');
    setIsCoachThinking(true);

    try {
      const reply = await callOffRampCoach(systemPrompt, updatedMessages);
      const parsedJson = extractDoneJson(reply);

      if (parsedJson) {
        handleTransitionToPreview(parsedJson);
      } else {
        setChatMessages([...updatedMessages, { role: 'model', content: reply }]);
      }
    } catch (err: any) {
      console.error('Coach failed:', err);
      setCoachError('Gemini call failed. Falling back to Quick save.');
      setMode('quick');
      setQuickNextAction(userChatInput || brainDump.slice(0, 100));
      showToast('Coach offline. Switched to Quick save.', 'error');
    } finally {
      setIsCoachThinking(false);
    }
  };

  // Step 5: Save everything to Google Sheet
  const handleSavePreview = async () => {
    if (!previewNextAction.trim()) {
      showToast('Next Action is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Project row if project exists in Projects table
      const existingProjectRow = (tables.Projects || []).find(
        (p) => (p.Project || p.Name) === selectedProject
      );
      if (existingProjectRow) {
        const projectUpdates: Record<string, any> = {
          'Next Action': previewNextAction.trim(),
          'In My Head': previewInMyHead.trim(),
          "Don't Redo": previewDontRedo.trim(),
          'Last Saved': currentDate,
        };
        if (['High', 'Medium', 'Low'].includes(previewPriority)) {
          projectUpdates.Priority = previewPriority;
        }
        await updateRecord('Projects', existingProjectRow, projectUpdates);
      }

      // 2. Create Save State row
      await createRecord('Save State', {
        Date: currentDate,
        Project: selectedProject,
        Area: existingProjectRow?.Category || selectedProject,
        'Next Action': previewNextAction.trim(),
        'In My Head': previewInMyHead.trim(),
        "Don't Redo": previewDontRedo.trim(),
        Energy: previewEnergy,
      });

      // 3. Create each new task in Tasks
      // (Status "Open", Given On today, Area "Admin", Priority "Medium")
      for (const t of previewTasks) {
        if (t.trim()) {
          await createRecord('Tasks', {
            Task: t.trim(),
            Status: 'Open',
            'Given On': currentDate,
            Area: 'Admin',
            Priority: 'Medium',
            Owner: 'Lourans',
          });
        }
      }

      // 4. For each claude_answers item: update that Coach Note
      // (Answer, Status "Answered", Answered On today)
      for (const ans of previewClaudeAnswers) {
        if (ans.answer?.trim()) {
          const noteToUpdate = (tables['Coach Notes'] || []).find(
            (n) => String(n.NoteID || n._row) === String(ans.note_id)
          );
          if (noteToUpdate) {
            await updateRecord('Coach Notes', noteToUpdate, {
              Answer: ans.answer.trim(),
              Status: 'Answered',
              'Answered On': currentDate,
            });
          }
        }
      }

      // 5. Create one Coach Note:
      // (From "Coach", Type "Interview", Project, Date today, Status "Done", Text = summary_for_claude)
      await createRecord('Coach Notes', {
        From: 'Coach',
        Type: 'Interview',
        Project: selectedProject,
        Date: currentDate,
        Status: 'Done',
        Text: previewSummaryForClaude || 'Interview completed.',
      });

      // 6. Calm full-screen confirmation for 2 seconds: "Saved. You can let go."
      setIsConfirmed(true);
      setTimeout(() => {
        setIsConfirmed(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Save Handler (Manual form fallback)
  const handleQuickSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNextAction.trim()) {
      showToast('Next Action is required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const existingProjectRow = (tables.Projects || []).find(
        (p) => (p.Project || p.Name) === selectedProject
      );
      if (existingProjectRow) {
        await updateRecord('Projects', existingProjectRow, {
          'Next Action': quickNextAction.trim(),
          'In My Head': '(quick save — complete tomorrow)',
          "Don't Redo": '',
          'Last Saved': currentDate,
        });
      }

      await createRecord('Save State', {
        Date: currentDate,
        Project: selectedProject,
        Area: existingProjectRow?.Category || selectedProject,
        'Next Action': quickNextAction.trim(),
        'In My Head': '(quick save — complete tomorrow)',
        "Don't Redo": '',
        Energy: previewEnergy || 'Medium',
      });

      setIsConfirmed(true);
      setTimeout(() => {
        setIsConfirmed(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch {
      // Toast handles error
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Calm full-screen confirmation screen
  if (isConfirmed) {
    return (
      <div className="fixed inset-0 z-[100] bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
          Saved. You can let go.
        </h2>
        <p className="text-stone-400 text-sm max-w-sm">
          Your state, tasks, and notes are safely committed. Rest well.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900 text-base">Off-Ramp Coach</h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full font-mono">
                  <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                  {currentStreak}d streak
                </span>
              </div>
              <p className="text-xs text-stone-500">
                End-of-day distillation &amp; alignment with Claude
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

        {/* Mode Selector */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between border-b border-stone-100 bg-stone-50/50 shrink-0">
          <div className="flex items-center p-1 bg-stone-100 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('coach')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                mode === 'coach'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Coach</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('quick')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                mode === 'quick'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick save</span>
            </button>
          </div>

          {/* Project Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-stone-400 uppercase">
              Project:
            </span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs font-semibold bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {availableProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {coachError && (
          <div className="mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{coachError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ======================================================== */}
          {/* MODE: QUICK SAVE (No AI Fallback)                       */}
          {/* ======================================================== */}
          {mode === 'quick' ? (
            <form onSubmit={handleQuickSaveSubmit} className="space-y-4">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-500">
                Quick Save mode records your single Next Action directly with In My Head = &quot;(quick save — complete tomorrow)&quot;.
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                  Tomorrow&apos;s #1 Next Action <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickNextAction}
                  onChange={(e) => setQuickNextAction(e.target.value)}
                  placeholder="What is the single thing to start with tomorrow morning?"
                  className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !quickNextAction.trim()}
                  className="px-6 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Quick save'}
                </button>
              </div>
            </form>
          ) : coachStep === 'dump' ? (
            /* ======================================================== */
            /* COACH STEP 1: BRAIN DUMP & CLAUDE QUESTIONS PREVIEW      */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Show Open Claude Questions if any */}
              {openClaudeQuestions.length > 0 && (
                <div className="p-4 bg-violet-50/70 border border-violet-200 rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-violet-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                    <span>Claude has questions for {selectedProject}:</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    {openClaudeQuestions.map((q) => (
                      <div key={q.NoteID || q._row} className="bg-white/80 p-2.5 rounded-xl border border-violet-100">
                        {q.Text}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-violet-700 italic">
                    The Coach will weave these into your interview so Claude gets aligned.
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Free Brain Dump
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleSpeechRecognition('dump')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isRecording
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? 'Listening...' : 'Dictate'}</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  autoFocus
                  value={brainDump}
                  onChange={(e) => setBrainDump(e.target.value)}
                  placeholder="Type or dictate anything on your mind: what you got done, what is blocked, what you decided, or what feels chaotic..."
                  className="w-full px-4 py-3 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="text-[11px] text-stone-400">
                  Step 1 of 3: Dump thoughts → Short interview → Card preview
                </span>
                <button
                  type="button"
                  onClick={handleStartCoachChat}
                  disabled={isCoachThinking || !brainDump.trim()}
                  className="px-6 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isCoachThinking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Distilling...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Interview</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : coachStep === 'chat' ? (
            /* ======================================================== */
            /* COACH STEP 2: INTERACTIVE CHAT BUBBLES                   */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-100">
                <span>Round {roundCount} of 4</span>
                <button
                  type="button"
                  onClick={() => {
                    setUserChatInput('Finalize now');
                    handleSendChatReply();
                  }}
                  className="text-indigo-600 hover:underline font-medium text-xs"
                >
                  Skip to final card →
                </button>
              </div>

              {/* Chat Messages */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {chatMessages.map((msg, idx) => {
                  const isModel = msg.role === 'model';
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 ${isModel ? 'justify-start' : 'justify-end'}`}
                    >
                      {isModel && (
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                          isModel
                            ? 'bg-stone-50 border border-stone-200/80 text-stone-900 font-medium'
                            : 'bg-stone-900 text-white font-normal'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {!isModel && (
                        <div className="w-7 h-7 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isCoachThinking && (
                  <div className="flex items-center gap-2 p-3 text-xs text-stone-400 animate-pulse">
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span>Coach is thinking...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('chat')}
                  className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse border-rose-600'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                  title="Speech-to-text"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  autoFocus
                  value={userChatInput}
                  onChange={(e) => setUserChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChatReply();
                  }}
                  placeholder="Answer or clarify..."
                  className="flex-1 px-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />

                <button
                  type="button"
                  onClick={handleSendChatReply}
                  disabled={isCoachThinking || !userChatInput.trim()}
                  className="p-2.5 rounded-xl bg-stone-900 hover:bg-black text-white disabled:opacity-50 transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* COACH STEP 3: RESULTING CARD EDITABLE PREVIEW            */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Review and edit your final distilled card before saving.
                </span>
              </div>

              {/* Next Action */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Tomorrow&apos;s Next Action <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={previewNextAction}
                  onChange={(e) => setPreviewNextAction(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* In My Head */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  In My Head
                </label>
                <textarea
                  rows={3}
                  value={previewInMyHead}
                  onChange={(e) => setPreviewInMyHead(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
                />
              </div>

              {/* Don't Redo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    ⛔ Don&apos;t Redo
                  </label>
                  <span className="text-[11px] font-mono text-stone-400">
                    {previewDontRedo.length}/200
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={200}
                  value={previewDontRedo}
                  onChange={(e) => setPreviewDontRedo(e.target.value)}
                  placeholder="Tried / decided already, and why"
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Energy 4 Big Emoji Buttons */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                  Energy Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {energyOptions.map((opt) => {
                    const isSelected = previewEnergy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPreviewEnergy(opt.value)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                        }`}
                      >
                        <span className="text-xl leading-none">{opt.emoji}</span>
                        <span className="text-xs font-semibold text-stone-800">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* New Tasks to Create in Tasks */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                  New Tasks to add to Tasks ({previewTasks.length})
                </label>
                <div className="space-y-1.5">
                  {previewTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={t}
                        onChange={(e) => {
                          const updated = [...previewTasks];
                          updated[idx] = e.target.value;
                          setPreviewTasks(updated);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewTasks(previewTasks.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTaskInput.trim()) {
                          e.preventDefault();
                          setPreviewTasks([...previewTasks, newTaskInput.trim()]);
                          setNewTaskInput('');
                        }
                      }}
                      placeholder="Add another task..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl placeholder-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTaskInput.trim()) {
                          setPreviewTasks([...previewTasks, newTaskInput.trim()]);
                          setNewTaskInput('');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-stone-200 hover:bg-stone-300 rounded-xl text-stone-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Answers to Claude */}
              {previewClaudeAnswers.length > 0 && (
                <div className="p-4 bg-violet-50/60 rounded-2xl border border-violet-200 space-y-2">
                  <div className="text-xs font-bold text-violet-900 uppercase tracking-wider">
                    Answers to Claude&apos;s Questions
                  </div>
                  {previewClaudeAnswers.map((ans, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-xs text-stone-700 font-medium">
                        {ans.question}
                      </div>
                      <input
                        type="text"
                        value={ans.answer}
                        onChange={(e) => {
                          const updated = [...previewClaudeAnswers];
                          updated[idx] = { ...updated[idx], answer: e.target.value };
                          setPreviewClaudeAnswers(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-violet-200 rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Summary for Claude */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Interview Summary for Claude
                </label>
                <textarea
                  rows={2}
                  value={previewSummaryForClaude}
                  onChange={(e) => setPreviewSummaryForClaude(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl text-stone-900"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCoachStep('chat')}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  ← Back to chat
                </button>

                <button
                  type="button"
                  disabled={isSaving || !previewNextAction.trim()}
                  onClick={handleSavePreview}
                  className="px-6 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Committing...' : 'Save & Close Day'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
