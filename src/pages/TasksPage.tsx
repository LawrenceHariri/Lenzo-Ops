/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { QuickAddModal } from '../components/QuickAddModal';
import { TaskEditDrawer } from '../components/TaskEditDrawer';
import {
  formatDisplayDate,
  groupTasks,
  isOpenTask,
  today,
} from '../logic';
import { useOpsHub } from '../store';
import { TaskRecord } from '../types';
import { fireTaskDoneConfetti } from '../utils/confetti';

type FilterType = 'Open' | 'Mine' | 'Waiting' | 'Check' | 'Done';

export const TasksPage: React.FC = () => {
  const { tables, serverDate, updateRecord, showToast } = useOpsHub();
  const currentDate = today(serverDate);

  const [activeFilter, setActiveFilter] = useState<FilterType>('Open');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<TaskRecord | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let list = tables.Tasks || [];

    // Filter by tab
    if (activeFilter === 'Open') {
      list = list.filter((t) => isOpenTask(t));
    } else if (activeFilter === 'Mine') {
      list = list.filter((t) => (t.Owner || '').toLowerCase().includes('lourans') && isOpenTask(t));
    } else if (activeFilter === 'Waiting') {
      list = list.filter((t) => (t.Status || '').trim() === 'Waiting');
    } else if (activeFilter === 'Check') {
      list = list.filter((t) => (t.Status || '').trim() === 'Check');
    } else if (activeFilter === 'Done') {
      list = list.filter((t) => (t.Status || '').trim() === 'Done');
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          (t.Task || '').toLowerCase().includes(q) ||
          (t.Owner || '').toLowerCase().includes(q) ||
          (t.Area || '').toLowerCase().includes(q) ||
          (t.Notes || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [tables.Tasks, activeFilter, searchQuery]);

  // Grouped tasks (Overdue, Today, This week, Later, No date)
  const grouped = useMemo(() => {
    return groupTasks(filteredTasks, currentDate);
  }, [filteredTasks, currentDate]);

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

  const filterChips: { id: FilterType; label: string }[] = [
    { id: 'Open', label: 'Open' },
    { id: 'Mine', label: 'Mine' },
    { id: 'Waiting', label: 'Waiting' },
    { id: 'Check', label: 'Check' },
    { id: 'Done', label: 'Done' },
  ];

  const renderTaskGroup = (
    title: string,
    tasks: TaskRecord[],
    highlightColor?: string,
    badgeText?: string
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {title}
            </h3>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {tasks.length}
            </span>
          </div>
          {badgeText && (
            <span className={`text-[11px] font-medium ${highlightColor || 'text-stone-400'}`}>
              {badgeText}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs divide-y divide-stone-100 overflow-hidden">
          {tasks.map((task) => {
            const dateInfo = formatDisplayDate(task.Due, currentDate);
            const isDone = task.Status === 'Done';
            const isCheck = task.Status === 'Check';

            return (
              <div
                key={task.TaskID || task._row}
                className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors border-l-4 border-l-indigo-500"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="mt-0.5 w-5 h-5 rounded-full border-2 border-stone-300 hover:border-indigo-600 flex items-center justify-center shrink-0 transition-colors"
                    aria-label="Toggle task status"
                  >
                    {isDone && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                  </button>

                  <div
                    onClick={() => setSelectedTaskToEdit(task)}
                    className="cursor-pointer flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isDone ? 'line-through text-stone-400' : 'text-stone-900'
                        }`}
                      >
                        {task.Task}
                      </span>
                      {isCheck && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Verify this
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-1">
                      {task.Due ? (
                        <span
                          className={`font-mono ${
                            dateInfo.isLate
                              ? 'text-rose-600 font-semibold'
                              : dateInfo.isToday
                              ? 'text-indigo-600 font-semibold'
                              : 'text-stone-500'
                          }`}
                        >
                          {dateInfo.badge || dateInfo.formatted}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">No date</span>
                      )}

                      <span>•</span>
                      <span>{task.Owner}</span>

                      {task.Priority && task.Priority !== 'Medium' && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            task.Priority === 'High'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {task.Priority}
                        </span>
                      )}

                      {task.Area && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {task.Area}
                        </span>
                      )}

                      {task.Status && task.Status !== 'Open' && !isCheck && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                          {task.Status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const totalTasksCount = filteredTasks.length;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Tasks
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Clear, prioritized actions grouped by time horizon
          </p>
        </div>

        {/* 1 primary button per screen rule */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black text-white shadow-md transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-indigo-400 stroke-[3]" />
          <span>Add task</span>
        </button>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === chip.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, owner..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grouped lists */}
      {totalTasksCount === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 shadow-xs">
          <div className="text-3xl mb-2">🎉</div>
          <h3 className="font-semibold text-stone-900 text-base">
            {activeFilter === 'Open'
              ? 'Nothing open right now'
              : `No tasks in "${activeFilter}"`}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Enjoy the breathing room or tap &quot;Add task&quot; to plan your next move.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderTaskGroup('Overdue', grouped.overdue, 'text-rose-600', 'Requires immediate attention')}
          {renderTaskGroup('Today', grouped.today, 'text-indigo-600', 'Focus for today')}
          {renderTaskGroup('This week', grouped.thisWeek, 'text-stone-500')}
          {renderTaskGroup('Later', grouped.later, 'text-stone-400')}
          {renderTaskGroup('No date', grouped.noDate, 'text-stone-400')}
        </div>
      )}

      {/* Drawers */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
      />

      <TaskEditDrawer
        task={selectedTaskToEdit}
        onClose={() => setSelectedTaskToEdit(null)}
      />
    </div>
  );
};
