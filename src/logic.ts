/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentRecord,
  LeadRecord,
  PartnerIssueRecord,
  SampleRecord,
  SaveStateRecord,
  SupportRecord,
  TaskRecord,
} from './types';

/**
 * Returns today's date in YYYY-MM-DD string format.
 * If serverDate from last load is passed, uses that; otherwise uses current local date.
 */
export function today(serverDate?: string): string {
  if (serverDate && /^\d{4}-\d{2}-\d{2}$/.test(serverDate.trim())) {
    return serverDate.trim();
  }
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds N days to a YYYY-MM-DD date string, returning YYYY-MM-DD.
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return today(d.toISOString().slice(0, 10));
  }
  const parts = dateStr.trim().split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD string into "Mon 28 Sep" and returns relative status (late, today, tomorrow).
 */
export function formatDisplayDate(
  dateStr?: string,
  todayStr?: string
): {
  formatted: string;
  badge?: string;
  isLate: boolean;
  isToday: boolean;
  isTomorrow: boolean;
} {
  if (!dateStr || !dateStr.trim()) {
    return { formatted: '—', isLate: false, isToday: false, isTomorrow: false };
  }

  const cleanDate = dateStr.trim();
  const parts = cleanDate.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return { formatted: cleanDate, isLate: false, isToday: false, isTomorrow: false };
  }

  const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const formatted = `${dayNames[targetDate.getDay()]} ${targetDate.getDate()} ${monthNames[targetDate.getMonth()]}`;

  if (!todayStr) {
    return { formatted, isLate: false, isToday: false, isTomorrow: false };
  }

  const todayParts = todayStr.trim().split('-').map(Number);
  const refDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);

  const diffTime = targetDate.getTime() - refDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const lateDays = Math.abs(diffDays);
    return {
      formatted,
      badge: lateDays === 1 ? '1 day late' : `${lateDays} days late`,
      isLate: true,
      isToday: false,
      isTomorrow: false,
    };
  } else if (diffDays === 0) {
    return {
      formatted,
      badge: 'today',
      isLate: false,
      isToday: true,
      isTomorrow: false,
    };
  } else if (diffDays === 1) {
    return {
      formatted,
      badge: 'tomorrow',
      isLate: false,
      isToday: false,
      isTomorrow: true,
    };
  }

  return { formatted, isLate: false, isToday: false, isTomorrow: false };
}

/**
 * Task helpers
 */
export function isOpenTask(t: TaskRecord): boolean {
  const status = (t.Status || '').trim();
  return !['Done', 'Dropped'].includes(status);
}

export function overdueTasks(tasks: TaskRecord[], todayDate: string): TaskRecord[] {
  return (tasks || []).filter(
    (t) => isOpenTask(t) && t.Due && t.Due.trim() !== '' && t.Due.trim() < todayDate
  );
}

export function todayTasks(tasks: TaskRecord[], todayDate: string): TaskRecord[] {
  return (tasks || []).filter(
    (t) => isOpenTask(t) && t.Due && t.Due.trim() === todayDate
  );
}

export function noDateTasks(tasks: TaskRecord[]): TaskRecord[] {
  return (tasks || []).filter(
    (t) => isOpenTask(t) && (!t.Due || t.Due.trim() === '')
  );
}

const PRIORITY_ORDER: Record<string, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
};

export function sortTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort((a, b) => {
    // Due date first (earlier first, empty last)
    const dueA = (a.Due || '').trim();
    const dueB = (b.Due || '').trim();
    if (dueA && dueB && dueA !== dueB) {
      return dueA.localeCompare(dueB);
    }
    if (dueA && !dueB) return -1;
    if (!dueA && dueB) return 1;

    // Priority next
    const pA = PRIORITY_ORDER[a.Priority?.trim() || ''] || 4;
    const pB = PRIORITY_ORDER[b.Priority?.trim() || ''] || 4;
    if (pA !== pB) return pA - pB;

    return 0;
  });
}

/**
 * Groups tasks into Overdue, Today, This week, Later, No date
 */
export function groupTasks(tasks: TaskRecord[], todayDate: string) {
  const parts = todayDate.split('-').map(Number);
  const cur = new Date(parts[0], parts[1] - 1, parts[2]);
  // End of current week (Sunday or +6 days)
  const dayOfWeek = cur.getDay(); // 0 is Sunday
  const daysUntilEndOfWeek = (7 - dayOfWeek) % 7 || 7;
  const endOfWeekDate = new Date(cur);
  endOfWeekDate.setDate(cur.getDate() + daysUntilEndOfWeek);
  const endOfWeekStr = `${endOfWeekDate.getFullYear()}-${String(
    endOfWeekDate.getMonth() + 1
  ).padStart(2, '0')}-${String(endOfWeekDate.getDate()).padStart(2, '0')}`;

  const overdue: TaskRecord[] = [];
  const todayList: TaskRecord[] = [];
  const thisWeek: TaskRecord[] = [];
  const later: TaskRecord[] = [];
  const noDate: TaskRecord[] = [];

  tasks.forEach((t) => {
    const due = (t.Due || '').trim();
    if (!due) {
      noDate.push(t);
    } else if (due < todayDate) {
      overdue.push(t);
    } else if (due === todayDate) {
      todayList.push(t);
    } else if (due <= endOfWeekStr) {
      thisWeek.push(t);
    } else {
      later.push(t);
    }
  });

  return {
    overdue: sortTasks(overdue),
    today: sortTasks(todayList),
    thisWeek: sortTasks(thisWeek),
    later: sortTasks(later),
    noDate: sortTasks(noDate),
  };
}

/**
 * Sample helpers
 * - sampleFollowUpsDue: Samples with Stage = "Shipped" and Follow-up Due <= today and no Follow-up Done On
 * - samplesToShip: Samples with Stage in ["Requested","Address confirmed"]
 */
export function sampleFollowUpsDue(
  samples: SampleRecord[],
  todayDate: string
): SampleRecord[] {
  return (samples || []).filter((s) => {
    const stage = (s.Stage || '').trim();
    const followUpDue = (s['Follow-up Due'] || '').trim();
    const followUpDone = (s['Follow-up Done On'] || '').trim();

    return (
      stage === 'Shipped' &&
      followUpDue !== '' &&
      followUpDue <= todayDate &&
      followUpDone === ''
    );
  });
}

export function samplesToShip(samples: SampleRecord[]): SampleRecord[] {
  const targetStages = ['Requested', 'Address confirmed'];
  return (samples || []).filter((s) => targetStages.includes((s.Stage || '').trim()));
}

/**
 * Lead helpers
 * - leadsDue: Leads with Stage not in ["Won","Lost"] and Next Step Date <= today (or empty Next Step Date → "needs a next step")
 */
export function isOpenLead(l: LeadRecord): boolean {
  const stage = (l.Stage || '').trim();
  return !['Won', 'Lost'].includes(stage);
}

export function leadsDue(leads: LeadRecord[], todayDate: string): LeadRecord[] {
  return (leads || []).filter((l) => {
    if (!isOpenLead(l)) return false;
    const nextStepDate = (l['Next Step Date'] || '').trim();
    return nextStepDate === '' || nextStepDate <= todayDate;
  });
}

export function leadsNeedingNextStep(leads: LeadRecord[]): LeadRecord[] {
  return (leads || []).filter((l) => {
    if (!isOpenLead(l)) return false;
    const nextStepDate = (l['Next Step Date'] || '').trim();
    return nextStepDate === '';
  });
}

/**
 * Agent helpers
 * - agentsNeeding1on1: Agents with Stage not in ["Left","Paused"] and (Next 1:1 empty or Next 1:1 <= today)
 */
export function agentsNeeding1on1(
  agents: AgentRecord[],
  todayDate: string
): AgentRecord[] {
  return (agents || []).filter((a) => {
    const stage = (a.Stage || '').trim();
    if (['Left', 'Paused'].includes(stage)) return false;
    const next1on1 = (a['Next 1:1'] || '').trim();
    return next1on1 === '' || next1on1 <= todayDate;
  });
}

/**
 * Issue and Support helpers
 * - openIssues: Partner Issues with Status != "Resolved"
 * - openSupport: Support with Status != "Resolved"
 */
export function openIssues(issues: PartnerIssueRecord[]): PartnerIssueRecord[] {
  return (issues || []).filter((i) => (i.Status || '').trim() !== 'Resolved');
}

export function openSupport(support: SupportRecord[]): SupportRecord[] {
  return (support || []).filter((s) => (s.Status || '').trim() !== 'Resolved');
}

/**
 * Save State helpers
 * - savedToday: true if Save State has a row with Date = today
 */
export function savedToday(
  saveState: SaveStateRecord[],
  todayDate: string
): boolean {
  return (saveState || []).some((row) => (row.Date || '').trim() === todayDate);
}

/**
 * Calculate streak: number of consecutive days with a Save State row.
 */
export function calculateSaveStreak(
  saveState: SaveStateRecord[],
  todayDate: string
): number {
  if (!saveState || saveState.length === 0) return 0;
  const uniqueDates = new Set(
    saveState.map((r) => (r.Date || '').trim()).filter(Boolean)
  );

  let streak = 0;
  let checkDate = todayDate;

  // If today isn't saved yet, check starting from yesterday
  if (!uniqueDates.has(checkDate)) {
    checkDate = addDays(todayDate, -1);
  }

  while (uniqueDates.has(checkDate)) {
    streak++;
    checkDate = addDays(checkDate, -1);
  }

  return streak;
}

/**
 * Calculate "X of Y done today"
 * Y = tasks due today + overdue at start of day (or done today with due <= today)
 * X = those marked Done today
 */
export function calculateTodayProgress(
  tasks: TaskRecord[],
  todayDate: string
): { done: number; total: number; percentage: number } {
  const relevantTasks = (tasks || []).filter((t) => {
    const due = (t.Due || '').trim();
    if (!due) return false;
    return due <= todayDate;
  });

  const doneTasks = relevantTasks.filter(
    (t) => (t.Status || '').trim() === 'Done'
  );

  const total = relevantTasks.length;
  const done = doneTasks.length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 100;

  return { done, total, percentage };
}

/**
 * "Your one thing" card at the top:
 * The single most urgent item:
 * 1) First overdue High-priority task
 * 2) Otherwise first overdue task
 * 3) Otherwise first sample follow-up
 * 4) Otherwise first task due today
 */
export type OneThingItem =
  | { type: 'task'; record: TaskRecord; reason: string }
  | { type: 'sample'; record: SampleRecord; reason: string };

export function getOneThing(
  tasks: TaskRecord[],
  samples: SampleRecord[],
  todayDate: string
): OneThingItem | null {
  const overdue = overdueTasks(tasks, todayDate);
  const overdueHigh = overdue.find((t) => (t.Priority || '').trim() === 'High');
  if (overdueHigh) {
    return {
      type: 'task',
      record: overdueHigh,
      reason: 'Overdue High-Priority Task',
    };
  }

  if (overdue.length > 0) {
    return {
      type: 'task',
      record: overdue[0],
      reason: 'Overdue Task',
    };
  }

  const sampleFollowUps = sampleFollowUpsDue(samples, todayDate);
  if (sampleFollowUps.length > 0) {
    return {
      type: 'sample',
      record: sampleFollowUps[0],
      reason: 'Sample Follow-up Call Due',
    };
  }

  const todayList = todayTasks(tasks, todayDate);
  if (todayList.length > 0) {
    return {
      type: 'task',
      record: todayList[0],
      reason: 'Due Today',
    };
  }

  return null;
}

/**
 * Greeting based on current local hour
 */
export function getGreeting(userName = 'Lourans'): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${userName}`;
  if (hour < 17) return `Good afternoon, ${userName}`;
  return `Good evening, ${userName}`;
}

