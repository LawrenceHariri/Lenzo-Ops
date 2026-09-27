/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAccessToken, getCurrentUser } from './firebase';
import {
  AllDataResult,
  BaseRecord,
  DropdownLists,
  TABLE_ID_FIELDS,
  TABLE_NAMES,
  TABLE_PREFIXES,
  TableName,
  TablesData,
} from './types';

// The Google Sheet "Lenzo Ops Hub" is the ONLY place where data lives
export const SPREADSHEET_ID = '1CKJ70Xfkz66WH0A3_UgcGpaaO-siX7E1Y_jZqsKDn5U';

export const STORAGE_KEY_PIN_HASH = 'opshub.pinHash';

// In-memory token storage fallback (for compatibility)
let inMemoryIdToken: string = '';

export function getIdToken(): string {
  return inMemoryIdToken;
}

export function setIdToken(token: string): void {
  inMemoryIdToken = token ? token.trim() : '';
}

export function clearIdToken(): void {
  inMemoryIdToken = '';
}

// Canonical columns for each operational table
export const DEFAULT_COLUMNS: Record<TableName, string[]> = {
  Samples: [
    'SampleID',
    'Business',
    'Contact',
    'Phone',
    'Address',
    'City',
    'Requested On',
    'Found By',
    'Owner',
    'Stage',
    'Items To Send',
    'Shipped On',
    'Tracking',
    'Follow-up Due',
    'Follow-up Done On',
    'Outcome',
    'Source',
    'Notes',
  ],
  Leads: [
    'LeadID',
    'Business',
    'Contact',
    'Phone',
    'City',
    'Owner',
    'Stage',
    'Last Contact',
    'Next Step',
    'Next Step Date',
    'Source',
    'Notes',
  ],
  Tasks: [
    'TaskID',
    'Task',
    'Owner',
    'Area',
    'Priority',
    'Given On',
    'Due',
    'Status',
    'Source',
    'Notes',
  ],
  Agents: [
    'AgentID',
    'Name',
    'Email',
    'Based In',
    'Languages',
    'Stage',
    'Started',
    'Current Level',
    'Latest Score',
    'Last 1:1',
    'Next 1:1',
    'Strengths',
    'Working On',
    'Blockers',
    'Your Commitments',
    'Notes',
  ],
  Trainings: [
    'TrainingID',
    'Date',
    'Agent',
    'Topic',
    'Result',
    'Follow-up',
    'Notes Link',
  ],
  Partners: [
    'PartnerID',
    'Business',
    'Contact',
    'Stage',
    'Terms',
    'Stock Placed',
    'Settlement',
    'Last Contact',
    'Next Check-in',
    'Documents',
    'Notes',
  ],
  'Partner Issues': [
    'IssueID',
    'Partner',
    'Issue',
    'Owner',
    'Opened',
    'Status',
    'Next Step',
    'Source',
  ],
  Support: [
    'TicketID',
    'Customer',
    'Channel',
    'Issue',
    'Opened',
    'Status',
    'Next Step',
    'Notes',
  ],
  'Save State': [
    'Date',
    'Area',
    'Project',
    'Next Action',
    'In My Head',
    "Don't Redo",
    'Energy',
  ],
  Projects: [
    'ProjectID',
    'Project',
    'Category',
    'Status',
    'Priority',
    'Next Action',
    'In My Head',
    "Don't Redo",
    'Last Saved',
    'Where It Lives',
    'Notes',
  ],
  'Coach Config': ['Key', 'Value', 'Updated'],
  'Coach Notes': [
    'NoteID',
    'Date',
    'Project',
    'From',
    'Type',
    'Text',
    'Status',
    'Answer',
    'Answered On',
  ],
  Reminders: ['ReminderID', 'Text', 'When', 'Repeat', 'Status', 'Link'],
};

// Explicit known date columns
const KNOWN_DATE_COLUMNS = new Set([
  'requested on',
  'shipped on',
  'follow-up due',
  'follow-up done on',
  'last contact',
  'next step date',
  'given on',
  'due',
  'started',
  'last 1:1',
  'next 1:1',
  'date',
  'follow-up',
  'next check-in',
  'opened',
  'last saved',
  'updated',
  'answered on',
  'due date',
]);

/**
 * Checks whether a column name represents a datetime field ("When", "Sent At")
 */
export function isDateTimeColumn(columnName: string): boolean {
  if (!columnName) return false;
  const lower = columnName.trim().toLowerCase();
  return lower === 'when' || lower === 'sent at' || lower === 'sent_at';
}

/**
 * Checks whether a column name represents a date field
 */
export function isDateColumn(columnName: string): boolean {
  if (!columnName) return false;
  const lower = columnName.trim().toLowerCase();
  if (isDateTimeColumn(columnName)) return false;
  return (
    KNOWN_DATE_COLUMNS.has(lower) ||
    lower === 'date' ||
    lower.endsWith(' on') ||
    lower.endsWith(' date') ||
    lower.endsWith(' due') ||
    lower.startsWith('date ')
  );
}

/**
 * Normalizes any date value (including US dates, Sheet datetimes like "9/28/2026 3:00:00",
 * ISO strings, Excel serials) into plain "YYYY-MM-DD" text-date.
 */
export function formatDateValue(val: any): string {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (!str) return '';

  // Numeric serial from Google Sheets/Excel (e.g. 46293 or 46293.125)
  if (/^\d{5}(?:\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Already YYYY-MM-DD or YYYY-M-D with optional time component
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // M/D/YYYY or D/M/YYYY with optional time component (e.g. "9/28/2026 3:00:00")
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+.*)?$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];
    let m = p1;
    let d = p2;
    if (p1 > 12) {
      d = p1;
      m = p2;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Fallback to standard Date parsing
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Normalizes any datetime value into plain "YYYY-MM-DD HH:mm".
 * Do not include time zones or seconds.
 */
export function formatDateTimeValue(val: any): string {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    const hh = String(val.getHours()).padStart(2, '0');
    const mm = String(val.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }
  const str = String(val).trim();
  if (!str) return '';

  // Numeric serial with time fraction
  if (/^\d{5}(?:\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      const hh = String(date.getUTCHours()).padStart(2, '0');
      const mm = String(date.getUTCMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    }
  }

  // YYYY-MM-DD with optional time
  const ymdTimeMatch = str.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::\d{1,2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
  );
  if (ymdTimeMatch) {
    const y = ymdTimeMatch[1];
    const m = ymdTimeMatch[2].padStart(2, '0');
    const d = ymdTimeMatch[3].padStart(2, '0');
    const hh = ymdTimeMatch[4] !== undefined ? ymdTimeMatch[4].padStart(2, '0') : '00';
    const mm = ymdTimeMatch[5] !== undefined ? ymdTimeMatch[5].padStart(2, '0') : '00';
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  // M/D/YYYY with optional time (e.g. "9/28/2026 3:00:00")
  const slashTimeMatch = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::\d{1,2})?(?:\s*(AM|PM))?)?$/i
  );
  if (slashTimeMatch) {
    const p1 = parseInt(slashTimeMatch[1], 10);
    const p2 = parseInt(slashTimeMatch[2], 10);
    const y = slashTimeMatch[3];
    let m = p1;
    let d = p2;
    if (p1 > 12) {
      d = p1;
      m = p2;
    }
    let hh = slashTimeMatch[4] !== undefined ? parseInt(slashTimeMatch[4], 10) : 0;
    const mm = slashTimeMatch[5] !== undefined ? slashTimeMatch[5].padStart(2, '0') : '00';
    const ampm = slashTimeMatch[6]?.toUpperCase();
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(hh).padStart(2, '0')}:${mm}`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  return str;
}

// Fallback lists if Lists sheet is partially defined
const DEFAULT_LISTS: DropdownLists = {
  People: ['Lourans', 'Lawrence', 'Ops Team'],
  SampleStage: [
    'Requested',
    'To Ship',
    'Shipped',
    'Follow-up Due',
    'Converted',
    'Lost',
  ],
  LeadStage: ['New', 'Contacted', 'Engaged', 'Converted', 'Cold'],
  TaskStatus: ['Next', 'Doing', 'Waiting', 'Done', 'Dropped'],
  Area: ['Samples', 'Leads', 'Partners', 'Support', 'Ops', 'Team'],
  AgentStage: ['Onboarding', 'Active', 'Review', 'Offboarded'],
  Priority: ['High', 'Normal', 'Low'],
  IssueStatus: ['Open', 'Investigating', 'Resolved'],
  Channel: ['Email', 'WhatsApp', 'Phone', 'Chat'],
  Energy: ['High', 'Medium', 'Low'],
  ProjectStatus: ['Active', 'Waiting', 'Completed'],
  NoteFrom: ['Claude', 'Coach'],
  NoteType: ['Question', 'Brief', 'Interview'],
  NoteStatus: ['Open', 'Answered', 'Done'],
};

/**
 * Helper to get active access token or throw an auth error
 */
async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not signed in with Google. Please sign in to access the sheet.');
  }
  return token;
}

/**
 * Samples Rule:
 * When "Shipped On" is set and "Follow-up Due" is empty, set Follow-up Due = Shipped On + 3 days.
 */
export function applySamplesRule(data: Record<string, any>): void {
  if (data['Shipped On'] && !data['Follow-up Due']) {
    const cleanShippedOn = formatDateValue(data['Shipped On']);
    if (!cleanShippedOn) return;

    data['Shipped On'] = cleanShippedOn;
    const parts = cleanShippedOn.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) {
        d.setUTCDate(d.getUTCDate() + 3);
        data['Follow-up Due'] = d.toISOString().slice(0, 10);
        return;
      }
    }

    const d = new Date(cleanShippedOn);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 3);
      data['Follow-up Due'] = d.toISOString().slice(0, 10);
    }
  }
}

/**
 * Helper to fetch a single range from the Sheet
 */
async function fetchSheetRange(
  range: string,
  accessToken: string
): Promise<{ values?: any[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    SPREADSHEET_ID
  )}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Get spreadsheet details: title and sheet tab names
 */
export async function getSpreadsheetDetails(
  accessToken: string
): Promise<{ title: string; sheets: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    SPREADSHEET_ID
  )}?fields=properties.title,sheets.properties.title`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Lenzo Ops Hub';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);
  return { title, sheets };
}

/**
 * Test sheet connection: reads the Sheet and returns number of tabs
 */
export async function testConnection(): Promise<{
  ok: boolean;
  tabsCount?: number;
  tabs?: string[];
  error?: string;
}> {
  try {
    const token = await requireAccessToken();
    const details = await getSpreadsheetDetails(token);
    return {
      ok: true,
      tabsCount: details.sheets.length,
      tabs: details.sheets,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to connect to spreadsheet',
    };
  }
}

/**
 * 1) READ everything (loadAll)
 * Reads all tables and the "Lists" dropdown tab from the Google Sheet
 */
export async function loadAll(_overrideConfig?: any): Promise<AllDataResult> {
  const token = await requireAccessToken();
  const details = await getSpreadsheetDetails(token);
  const existingSheetNames = new Set(details.sheets);

  // Request ranges for existing operational tables plus the "Lists" sheet
  const rangesToFetch: string[] = [];
  TABLE_NAMES.forEach((tableName) => {
    if (existingSheetNames.has(tableName)) {
      rangesToFetch.push(`'${tableName}'!A1:Z5000`);
    }
  });

  const hasListsTab = existingSheetNames.has('Lists');
  if (hasListsTab) {
    rangesToFetch.push(`'Lists'!A1:Z100`);
  }

  let valueRanges: Array<{ range: string; values?: any[][] }> = [];

  if (rangesToFetch.length > 0) {
    const encodedRanges = rangesToFetch
      .map((r) => `ranges=${encodeURIComponent(r)}`)
      .join('&');
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      SPREADSHEET_ID
    )}/values:batchGet?${encodedRanges}`;

    const res = await fetch(batchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken(token)}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch spreadsheet ranges (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    valueRanges = data.valueRanges || [];
  }

  // Populate tables
  const tables: TablesData = {
    Samples: [],
    Leads: [],
    Tasks: [],
    Agents: [],
    Trainings: [],
    Partners: [],
    'Partner Issues': [],
    Support: [],
    'Save State': [],
    Projects: [],
    'Coach Config': [],
    'Coach Notes': [],
    Reminders: [],
  };

  const parsedPeople = new Set<string>();
  const parsedDropdownLists: DropdownLists = { ...DEFAULT_LISTS };

  valueRanges.forEach((vr) => {
    const match = vr.range?.match(/^'?([^'!]+)'?!/);
    const sheetName = match ? match[1] : '';
    if (!sheetName) return;

    const rows = vr.values || [];
    if (rows.length < 1) return;

    // Handle "Lists" dropdown tab: row 1 = list names, rows 2+ = items
    if (sheetName === 'Lists') {
      const listNames: string[] = rows[0].map((h) => String(h || '').trim());
      const itemRows = rows.slice(1);

      listNames.forEach((name, colIdx) => {
        if (!name) return;
        const items = itemRows
          .map((row) => (row[colIdx] !== undefined ? String(row[colIdx]).trim() : ''))
          .filter(Boolean);

        if (items.length > 0) {
          parsedDropdownLists[name] = items;
        }
      });
      return;
    }

    // Standard operational table
    if (!TABLE_NAMES.includes(sheetName as TableName)) return;

    const headers: string[] = rows[0].map((h) => String(h || '').trim());
    const dataRows = rows.slice(1);

    const mapped = dataRows
      .map((row, idx) => {
        const record: Record<string, any> = { _row: idx + 2 };
        let hasContent = false;

        headers.forEach((header, colIdx) => {
          if (!header) return;
          let val = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : '';

          if (val) {
            if (isDateTimeColumn(header)) {
              val = formatDateTimeValue(val);
            } else if (isDateColumn(header)) {
              val = formatDateValue(val);
            }
          }

          record[header] = val;
          if (val) hasContent = true;

          // Collect people names if column is Owner or Agent
          if ((header === 'Owner' || header === 'Agent') && val) {
            parsedPeople.add(val);
          }
        });

        return hasContent ? record : null;
      })
      .filter(Boolean) as any[];

    tables[sheetName as TableName] = mapped;
  });

  // Ensure people from tables are represented in People dropdown
  if (parsedPeople.size > 0) {
    const combinedPeople = Array.from(
      new Set([...(parsedDropdownLists.People || DEFAULT_LISTS.People || []), ...Array.from(parsedPeople)])
    );
    parsedDropdownLists.People = combinedPeople;
  }

  const currentUser = getCurrentUser();
  const todayIso = new Date().toISOString().slice(0, 10);

  return {
    tables,
    lists: parsedDropdownLists,
    serverDate: todayIso,
    user: currentUser
      ? {
          email: currentUser.email || undefined,
          name: currentUser.displayName || undefined,
          picture: currentUser.photoURL || undefined,
        }
      : null,
  };
}

/**
 * 2) CREATE a row (createRecord)
 * Appends a row directly to the Sheet; generates ID as prefix + next number
 */
export async function createRecord<T extends BaseRecord = BaseRecord>(
  table: TableName,
  data: Record<string, any>,
  _overrideIdToken?: string
): Promise<T> {
  const token = await requireAccessToken();

  // Reminders rule: default Status to "Scheduled"
  if (table === 'Reminders') {
    if (!data.Status) {
      data.Status = 'Scheduled';
    }
  }

  // Samples rule: Follow-up Due = Shipped On + 3 days if empty
  if (table === 'Samples') {
    applySamplesRule(data);
  }

  // ID Generation rule: prefix + next number
  // "Save State" and "Coach Config" have no ID.
  const prefix = TABLE_PREFIXES[table];
  const idField = TABLE_ID_FIELDS[table];

  if (prefix && idField && !data[idField]) {
    // Read the table rows to determine the maximum existing number
    const rangeRes = await fetchSheetRange(`'${table}'!A:Z`, token);
    const rows = rangeRes.values || [];
    let maxNum = 0;

    if (rows.length > 1) {
      const headers = rows[0].map((h) => String(h || '').trim());
      const idColIdx = headers.indexOf(idField);

      if (idColIdx >= 0) {
        const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
        for (let r = 1; r < rows.length; r++) {
          const val = String(rows[r][idColIdx] || '').trim();
          const match = val.match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
    }

    data[idField] = `${prefix}${maxNum + 1}`;
  }

  // Get current headers of the table
  const headerRes = await fetchSheetRange(`'${table}'!1:1`, token);
  let headers: string[] = (headerRes.values?.[0] || []).map((h) => String(h || '').trim());

  if (headers.length === 0) {
    headers = DEFAULT_COLUMNS[table] || Object.keys(data);
  }

  // Normalize date and datetime values in data
  headers.forEach((col) => {
    if (data[col] !== undefined && data[col] !== null) {
      const rawVal = String(data[col]).trim();
      if (rawVal) {
        if (isDateTimeColumn(col)) {
          data[col] = formatDateTimeValue(rawVal);
        } else if (isDateColumn(col)) {
          data[col] = formatDateValue(rawVal);
        }
      }
    }
  });

  // Construct row values matching header columns
  const rowValues = headers.map((col) => {
    const val = data[col];
    if (val === undefined || val === null) return '';
    const rawVal = String(val).trim();
    if (!rawVal) return '';
    if (isDateTimeColumn(col)) {
      return formatDateTimeValue(rawVal);
    }
    if (isDateColumn(col)) {
      return formatDateValue(rawVal);
    }
    return String(val);
  });

  // Append row
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    SPREADSHEET_ID
  )}/values/'${encodeURIComponent(table)}'!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!appendRes.ok) {
    const errorText = await appendRes.text();
    throw new Error(`Google Sheets append failed (${appendRes.status}): ${errorText}`);
  }

  const resJson = await appendRes.json();
  const updatedRange = resJson.updates?.updatedRange || '';
  const rangeMatch = updatedRange.match(/!A(\d+):/);
  const newRowNumber = rangeMatch ? parseInt(rangeMatch[1], 10) : 999;

  return {
    _row: newRowNumber,
    ...data,
  } as T;
}

/**
 * 3) UPDATE a row (updateRecord)
 * Re-reads that row first and checks its ID still matches; if not, throws "Sheet changed — please retry".
 */
export async function updateRecord<T extends BaseRecord = BaseRecord>(
  table: TableName,
  record: T,
  changes: Record<string, any>,
  _overrideIdToken?: string
): Promise<T> {
  const token = await requireAccessToken();

  if (typeof record._row !== 'number' || record._row < 2) {
    throw new Error('Cannot update record: missing valid _row identifier.');
  }

  // Samples rule on update
  if (table === 'Samples') {
    const effectiveShippedOn =
      changes['Shipped On'] !== undefined ? changes['Shipped On'] : record['Shipped On'];
    const effectiveFollowUp =
      changes['Follow-up Due'] !== undefined ? changes['Follow-up Due'] : record['Follow-up Due'];

    if (effectiveShippedOn && !effectiveFollowUp) {
      const merged: Record<string, any> = { ...changes, 'Shipped On': effectiveShippedOn };
      applySamplesRule(merged);
      if (merged['Follow-up Due']) {
        changes['Follow-up Due'] = merged['Follow-up Due'];
      }
    }
  }

  // Fetch header row
  const headerRes = await fetchSheetRange(`'${table}'!1:1`, token);
  let headers: string[] = (headerRes.values?.[0] || []).map((h) => String(h || '').trim());
  if (headers.length === 0) {
    headers = DEFAULT_COLUMNS[table];
  }

  // Concurrency check: Re-read that row first and check its ID still matches
  const idField = TABLE_ID_FIELDS[table];
  const rowRes = await fetchSheetRange(`'${table}'!A${record._row}:Z${record._row}`, token);
  const rawRowValues = rowRes.values?.[0] || [];
  const currentRowValues = headers.map((col, idx) => {
    const v = rawRowValues[idx];
    if (v === undefined || v === null) return '';
    let str = String(v).trim();
    if (str) {
      if (isDateTimeColumn(col)) {
        str = formatDateTimeValue(str);
      } else if (isDateColumn(col)) {
        str = formatDateValue(str);
      }
    }
    return str;
  });

  if (idField && record[idField]) {
    const idColIdx = headers.indexOf(idField);
    if (idColIdx >= 0) {
      const sheetIdValue = String(currentRowValues[idColIdx] || '').trim();
      const expectedIdValue = String(record[idField] || '').trim();
      if (sheetIdValue !== expectedIdValue) {
        throw new Error('Sheet changed — please retry');
      }
    }
  }

  // Normalize date and datetime values in changes
  Object.keys(changes).forEach((col) => {
    if (changes[col] !== undefined && changes[col] !== null) {
      const rawVal = String(changes[col]).trim();
      if (rawVal) {
        if (isDateTimeColumn(col)) {
          changes[col] = formatDateTimeValue(rawVal);
        } else if (isDateColumn(col)) {
          changes[col] = formatDateValue(rawVal);
        }
      }
    }
  });

  // Construct new row values
  const newRowValues: string[] = headers.map((col, idx) => {
    let valToSend = '';
    if (changes[col] !== undefined) {
      valToSend = String(changes[col]).trim();
    } else {
      valToSend = currentRowValues[idx] !== undefined ? currentRowValues[idx] : '';
    }

    if (valToSend) {
      if (isDateTimeColumn(col)) {
        return formatDateTimeValue(valToSend);
      }
      if (isDateColumn(col)) {
        return formatDateValue(valToSend);
      }
    }
    return valToSend;
  });

  const lastColLetter = String.fromCharCode(65 + Math.min(headers.length - 1, 25));
  const updateRange = `'${table}'!A${record._row}:${lastColLetter}${record._row}`;

  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    SPREADSHEET_ID
  )}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [newRowValues],
    }),
  });

  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`Google Sheets update failed (${putRes.status}): ${errorText}`);
  }

  return {
    ...record,
    ...changes,
  };
}

function accessToken(token: string): string {
  return token;
}
