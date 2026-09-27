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
  Reminders: ['ReminderID', 'Task', 'Due Date', 'Owner', 'Status', 'Notes'],
};

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
    const raw = String(data['Shipped On']).trim();
    if (!raw) return;

    // Handle YYYY-MM-DD
    const parts = raw.split('-');
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

    const d = new Date(raw);
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
          const val = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
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

  // Construct row values matching header columns
  const rowValues = headers.map((col) => (data[col] !== undefined ? String(data[col]) : ''));

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
  const currentRowValues = (rowRes.values?.[0] || []).map((v) => (v !== undefined ? String(v) : ''));

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

  // Construct new row values
  const newRowValues: string[] = headers.map((col, idx) => {
    if (changes[col] !== undefined) {
      return String(changes[col]);
    }
    return currentRowValues[idx] !== undefined ? currentRowValues[idx] : '';
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
