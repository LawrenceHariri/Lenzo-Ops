/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AllDataResult,
  DropdownLists,
  TABLE_ID_FIELDS,
  TABLE_NAMES,
  TableName,
  TablesData,
} from '../types';

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export const TABLE_COLUMNS: Record<TableName, string[]> = {
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
};

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
 * Extract spreadsheet ID from raw input (supports full URLs or pure IDs)
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * List user spreadsheets from Google Drive API
 */
export async function listDriveSpreadsheets(
  accessToken: string
): Promise<DriveSpreadsheetItem[]> {
  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,modifiedTime,webViewLink)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));
}

/**
 * Retrieve spreadsheet metadata (title, sheet names)
 */
export async function getSpreadsheetDetails(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
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
  const title = data.properties?.title || 'Spreadsheet';
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);
  return { title, sheets };
}

/**
 * Read all tables in batch from a Google Sheet
 */
export async function readAllTablesFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<AllDataResult> {
  const details = await getSpreadsheetDetails(spreadsheetId, accessToken);
  const existingSheetNames = new Set(details.sheets);

  // Request ranges for sheets that exist
  const rangesToFetch: string[] = [];
  TABLE_NAMES.forEach((tableName) => {
    if (existingSheetNames.has(tableName)) {
      rangesToFetch.push(`'${tableName}'!A1:Z1000`);
    }
  });

  let valueRanges: Array<{ range: string; values?: any[][] }> = [];

  if (rangesToFetch.length > 0) {
    const encodedRanges = rangesToFetch
      .map((r) => `ranges=${encodeURIComponent(r)}`)
      .join('&');
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values:batchGet?${encodedRanges}`;

    const res = await fetch(batchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch spreadsheet ranges (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    valueRanges = data.valueRanges || [];
  }

  // Map each table
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
  };

  const parsedPeople = new Set<string>();

  valueRanges.forEach((vr) => {
    // Extract sheet name from range e.g. "'Samples'!A1:Z1000"
    const match = vr.range?.match(/^'?([^'!]+)'?!/);
    const sheetName = match ? match[1] : '';
    if (!sheetName || !TABLE_NAMES.includes(sheetName as TableName)) return;

    const rows = vr.values || [];
    if (rows.length < 1) return;

    const headers: string[] = rows[0].map((h) => String(h || '').trim());
    const dataRows = rows.slice(1);

    const mapped = dataRows
      .map((row, idx) => {
        const record: Record<string, any> = { _row: idx + 2 };
        let hasContent = false;

        headers.forEach((header, colIdx) => {
          if (!header) return;
          const val = row[colIdx] !== undefined ? String(row[colIdx]) : '';
          record[header] = val;
          if (val) hasContent = true;

          // Collect people names if column is Owner or Agent
          if ((header === 'Owner' || header === 'Agent') && val.trim()) {
            parsedPeople.add(val.trim());
          }
        });

        return hasContent ? record : null;
      })
      .filter(Boolean) as any[];

    tables[sheetName as TableName] = mapped;
  });

  const mergedLists: DropdownLists = {
    ...DEFAULT_LISTS,
    People:
      parsedPeople.size > 0
        ? Array.from(new Set([...(DEFAULT_LISTS.People || []), ...Array.from(parsedPeople)]))
        : DEFAULT_LISTS.People,
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  return {
    tables,
    lists: mergedLists,
    serverDate: todayIso,
  };
}

/**
 * Append a row to a table in Google Sheets
 */
export async function appendRowToSheet(
  spreadsheetId: string,
  table: TableName,
  data: Record<string, any>,
  accessToken: string
): Promise<any> {
  const columns = TABLE_COLUMNS[table] || Object.keys(data);
  const rowValues = columns.map((col) => (data[col] !== undefined ? data[col] : ''));

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/'${encodeURIComponent(table)}'!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets append failed (${res.status}): ${errorText}`);
  }

  const responseJson = await res.json();
  // Try to parse appended row number from updatedRange e.g. "'Samples'!A15:R15"
  const rangeMatch = responseJson.updates?.updatedRange?.match(/!A(\d+):/);
  const newRowNumber = rangeMatch ? parseInt(rangeMatch[1], 10) : 999;

  return {
    _row: newRowNumber,
    ...data,
  };
}

/**
 * Update a specific row in a table in Google Sheets
 */
export async function updateRowInSheet(
  spreadsheetId: string,
  table: TableName,
  row: number,
  changes: Record<string, any>,
  accessToken: string
): Promise<any> {
  // First fetch the header row to know exact column positions
  const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/'${encodeURIComponent(table)}'!1:1`;

  const headerRes = await fetch(headerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let headers: string[] = [];
  if (headerRes.ok) {
    const headerData = await headerRes.json();
    headers = (headerData.values?.[0] || []).map((h: any) => String(h || '').trim());
  }
  if (!headers.length) {
    headers = TABLE_COLUMNS[table];
  }

  // Fetch current row values
  const rowUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/'${encodeURIComponent(table)}'!A${row}:Z${row}`;

  const rowRes = await fetch(rowUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let currentValues: string[] = [];
  if (rowRes.ok) {
    const rowData = await rowRes.json();
    currentValues = (rowData.values?.[0] || []).map((v: any) => (v !== undefined ? String(v) : ''));
  }

  // Construct new row values
  const newRowValues: string[] = headers.map((col, idx) => {
    if (changes[col] !== undefined) {
      return String(changes[col]);
    }
    return currentValues[idx] !== undefined ? currentValues[idx] : '';
  });

  // Calculate last column letter (A to Z)
  const lastColLetter = String.fromCharCode(65 + Math.min(headers.length - 1, 25));
  const updateRange = `'${table}'!A${row}:${lastColLetter}${row}`;
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [newRowValues],
    }),
  });

  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`Google Sheets update failed (${resStatus(putRes)}): ${errorText}`);
  }

  const updatedRecord: Record<string, any> = { _row: row };
  headers.forEach((col, idx) => {
    updatedRecord[col] = newRowValues[idx];
  });

  return updatedRecord;
}

function resStatus(res: Response): number {
  return res.status;
}

/**
 * Create a new Lenzo Ops Hub Google Spreadsheet in the user's Google Drive
 * Pre-seeded with all 12 operational sheets and headers.
 */
export async function createLenzoSpreadsheet(
  accessToken: string,
  title = 'Lenzo-Ops Master Data'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheetsPayload = TABLE_NAMES.map((name) => ({
    properties: {
      title: name,
      gridProperties: {
        frozenRowCount: 1,
      },
    },
  }));

  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: sheetsPayload,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet (${createRes.status}): ${errorText}`);
  }

  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;
  const spreadsheetUrl = newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Populate header row for each sheet
  const valueRanges = TABLE_NAMES.map((name) => ({
    range: `'${name}'!A1`,
    values: [TABLE_COLUMNS[name]],
  }));

  const populateHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchUpdate`;

  await fetch(populateHeadersUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  });

  return { spreadsheetId, spreadsheetUrl };
}
