/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AllDataResult,
  ApiResponse,
  BaseRecord,
  TABLE_ID_FIELDS,
  TableName,
} from './types';

export const STORAGE_KEY_URL = 'opshub.url';
export const STORAGE_KEY_TOKEN = 'opshub.token';

export function getConnectionConfig(): { url: string; token: string } | null {
  if (typeof window === 'undefined') return null;
  const url = localStorage.getItem(STORAGE_KEY_URL)?.trim() || '';
  const token = localStorage.getItem(STORAGE_KEY_TOKEN)?.trim() || '';
  if (!url || !token) return null;
  return { url, token };
}

export function saveConnectionConfig(url: string, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_TOKEN, token.trim());
}

export function clearConnectionConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}

/**
 * 1) READ everything
 * GET {URL}?token={TOKEN}&action=all
 * redirect: "follow"
 */
export async function loadAll(
  overrideConfig?: { url: string; token: string }
): Promise<AllDataResult> {
  const config = overrideConfig || getConnectionConfig();
  if (!config?.url || !config?.token) {
    throw new Error('API URL or API Token is missing. Please configure settings.');
  }

  const { url, token } = config;
  const separator = url.includes('?') ? '&' : '?';
  const requestUrl = `${url}${separator}token=${encodeURIComponent(
    token
  )}&action=all`;

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      redirect: 'follow',
    });
  } catch (err: any) {
    throw new Error(`Network error connecting to API: ${err?.message || err}`);
  }

  let data: ApiResponse<AllDataResult>;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Invalid response from server (Status ${response.status}). Expected JSON.`
    );
  }

  if (!data.ok) {
    throw new Error(data.error || 'Failed to load data from server');
  }

  return data.result;
}

/**
 * 2) CREATE a row
 * POST {URL} with header "Content-Type: text/plain;charset=utf-8"
 * Body: JSON.stringify({ token, action: "create", table, data: { ...columns } })
 * Response: { ok: true, result: Record }
 */
export async function createRecord<T extends BaseRecord = BaseRecord>(
  table: TableName,
  data: Record<string, any>
): Promise<T> {
  const config = getConnectionConfig();
  if (!config?.url || !config?.token) {
    throw new Error('API URL or API Token is missing. Please configure settings.');
  }

  const payload = {
    token: config.token,
    action: 'create',
    table,
    data,
  };

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch (err: any) {
    throw new Error(`Network error creating record: ${err?.message || err}`);
  }

  let resultData: ApiResponse<T>;
  try {
    resultData = await response.json();
  } catch {
    throw new Error(
      `Invalid response from server (Status ${response.status}). Expected JSON.`
    );
  }

  if (!resultData.ok) {
    throw new Error(resultData.error || `Failed to create record in ${table}`);
  }

  return resultData.result;
}

/**
 * 3) UPDATE a row
 * Same POST, body: { token, action: "update", table, row: record._row, data: { ...only the changed columns, PLUS the record's ID column } }
 * Response: { ok: true, result: Record }
 */
export async function updateRecord<T extends BaseRecord = BaseRecord>(
  table: TableName,
  record: T,
  changes: Record<string, any>
): Promise<T> {
  const config = getConnectionConfig();
  if (!config?.url || !config?.token) {
    throw new Error('API URL or API Token is missing. Please configure settings.');
  }

  if (typeof record._row !== 'number') {
    throw new Error('Cannot update record: missing numeric _row identifier.');
  }

  const idField = TABLE_ID_FIELDS[table];
  const dataToSend: Record<string, any> = { ...changes };

  // Ensure record's ID column is included if it exists
  if (idField && record[idField] !== undefined) {
    dataToSend[idField] = record[idField];
  }

  const payload = {
    token: config.token,
    action: 'update',
    table,
    row: record._row,
    data: dataToSend,
  };

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch (err: any) {
    throw new Error(`Network error updating record: ${err?.message || err}`);
  }

  let resultData: ApiResponse<T>;
  try {
    resultData = await response.json();
  } catch {
    throw new Error(
      `Invalid response from server (Status ${response.status}). Expected JSON.`
    );
  }

  if (!resultData.ok) {
    throw new Error(resultData.error || `Failed to update record in ${table}`);
  }

  return resultData.result;
}
