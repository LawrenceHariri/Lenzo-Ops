/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  clearConnectionConfig,
  createRecord as apiCreateRecord,
  getConnectionConfig,
  loadAll,
  saveConnectionConfig,
  updateRecord as apiUpdateRecord,
} from './api';
import {
  AllDataResult,
  BaseRecord,
  DropdownLists,
  TableName,
  TablesData,
} from './types';

export interface ToastItem {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
  createdAt: number;
}

const emptyTables: TablesData = {
  Samples: [],
  Leads: [],
  Tasks: [],
  Agents: [],
  Trainings: [],
  Partners: [],
  'Partner Issues': [],
  Support: [],
  'Save State': [],
};

interface OpsHubContextType {
  tables: TablesData;
  lists: DropdownLists;
  serverDate: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastSynced: Date | null;
  config: { url: string; token: string } | null;
  isConfigured: boolean;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;
  saveConfig: (url: string, token: string) => Promise<boolean>;
  clearConfig: () => void;
  refresh: () => Promise<void>;
  testConnection: (
    testUrl?: string,
    testToken?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  createRecord: <T extends BaseRecord = BaseRecord>(
    table: TableName,
    data: Record<string, any>
  ) => Promise<T>;
  updateRecord: <T extends BaseRecord = BaseRecord>(
    table: TableName,
    record: T,
    changes: Record<string, any>
  ) => Promise<T>;
}

const OpsHubContext = createContext<OpsHubContextType | undefined>(undefined);

export function OpsHubProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<{ url: string; token: string } | null>(
    () => getConnectionConfig()
  );
  const [tables, setTables] = useState<TablesData>(emptyTables);
  const [lists, setLists] = useState<DropdownLists>({});
  const [serverDate, setServerDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const isConfigured = Boolean(config?.url && config?.token);
  const isFetchingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'error' | 'success' | 'info' = 'info') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, createdAt: Date.now() }]);
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  // Load data function
  const fetchData = useCallback(
    async (isBackground = false) => {
      const currentConfig = getConnectionConfig();
      if (!currentConfig?.url || !currentConfig?.token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (!isBackground) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const result: AllDataResult = await loadAll(currentConfig);

        // Ensure all tables exist as arrays
        const populatedTables: TablesData = {
          Samples: result.tables?.Samples || [],
          Leads: result.tables?.Leads || [],
          Tasks: result.tables?.Tasks || [],
          Agents: result.tables?.Agents || [],
          Trainings: result.tables?.Trainings || [],
          Partners: result.tables?.Partners || [],
          'Partner Issues': result.tables?.['Partner Issues'] || [],
          Support: result.tables?.Support || [],
          'Save State': result.tables?.['Save State'] || [],
        };

        setTables(populatedTables);
        setLists(result.lists || {});
        if (result.serverDate) {
          setServerDate(result.serverDate);
        }
        const now = new Date();
        setLastSynced(now);
        lastSyncTimeRef.current = now.getTime();
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to sync with Google Sheet';
        setError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    [showToast]
  );

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial load
  useEffect(() => {
    if (isConfigured) {
      fetchData(false);
    } else {
      setIsLoading(false);
    }
  }, [isConfigured, fetchData]);

  // Periodic refresh every 5 minutes (300,000 ms)
  useEffect(() => {
    if (!isConfigured) return;

    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isConfigured, fetchData]);

  // Tab focus & visibility change refresh (throttled to avoid rapid spam)
  useEffect(() => {
    if (!isConfigured) return;

    const handleFocusOrVisible = () => {
      const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
      // If at least 30 seconds have passed since last sync
      if (
        document.visibilityState === 'visible' &&
        timeSinceLastSync > 30 * 1000
      ) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [isConfigured, fetchData]);

  // Test connection method
  const testConnection = useCallback(
    async (testUrl?: string, testToken?: string) => {
      const urlToTest = testUrl || config?.url;
      const tokenToTest = testToken || config?.token;

      if (!urlToTest || !tokenToTest) {
        return { ok: false, error: 'API URL and Token must not be empty' };
      }

      try {
        await loadAll({ url: urlToTest.trim(), token: tokenToTest.trim() });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Connection failed' };
      }
    },
    [config]
  );

  // Save config
  const saveConfig = useCallback(
    async (newUrl: string, newToken: string): Promise<boolean> => {
      saveConnectionConfig(newUrl, newToken);
      const updated = { url: newUrl.trim(), token: newToken.trim() };
      setConfig(updated);
      showToast('Settings saved. Connecting...', 'info');
      try {
        const result = await loadAll(updated);
        setTables({
          Samples: result.tables?.Samples || [],
          Leads: result.tables?.Leads || [],
          Tasks: result.tables?.Tasks || [],
          Agents: result.tables?.Agents || [],
          Trainings: result.tables?.Trainings || [],
          Partners: result.tables?.Partners || [],
          'Partner Issues': result.tables?.['Partner Issues'] || [],
          Support: result.tables?.Support || [],
          'Save State': result.tables?.['Save State'] || [],
        });
        setLists(result.lists || {});
        if (result.serverDate) setServerDate(result.serverDate);
        const now = new Date();
        setLastSynced(now);
        lastSyncTimeRef.current = now.getTime();
        setError(null);
        showToast('Successfully connected to Google Sheet!', 'success');
        return true;
      } catch (err: any) {
        const msg = err?.message || 'Failed to connect with provided settings';
        setError(msg);
        showToast(msg, 'error');
        return false;
      }
    },
    [showToast]
  );

  // Clear config
  const clearConfig = useCallback(() => {
    clearConnectionConfig();
    setConfig(null);
    setTables(emptyTables);
    setLists({});
    setLastSynced(null);
    showToast('Connection settings cleared.', 'info');
  }, [showToast]);

  // Create record
  const createRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      data: Record<string, any>
    ): Promise<T> => {
      try {
        const newRecord = await apiCreateRecord<T>(table, data);
        // Append newly created record to store
        setTables((prev) => ({
          ...prev,
          [table]: [...(prev[table] || []), newRecord as any],
        }));
        showToast(`Record created in ${table}`, 'success');
        return newRecord;
      } catch (err: any) {
        const errorMsg = err?.message || `Failed to create record in ${table}`;
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [showToast]
  );

  // Update record with Optimistic Update
  const updateRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      record: T,
      changes: Record<string, any>
    ): Promise<T> => {
      // 1. Snapshot previous state for rollback
      let previousRecord: any = null;
      let targetIndex = -1;

      const currentList = (tables[table] || []) as any[];
      targetIndex = currentList.findIndex((item) => item._row === record._row);
      if (targetIndex >= 0) {
        previousRecord = currentList[targetIndex];
      }

      // 2. Apply optimistic update immediately
      const optimisticallyUpdated = {
        ...(previousRecord || record),
        ...changes,
      };

      setTables((prev) => {
        const list = [...(prev[table] || [])] as any[];
        const idx = list.findIndex((item) => item._row === record._row);
        if (idx >= 0) {
          list[idx] = optimisticallyUpdated;
        }
        return {
          ...prev,
          [table]: list as any,
        };
      });

      // 3. Perform network call
      try {
        const serverUpdated = await apiUpdateRecord<T>(table, record, changes);

        // Update with server confirmed record
        setTables((prev) => {
          const list = [...(prev[table] || [])] as any[];
          const idx = list.findIndex((item) => item._row === record._row);
          if (idx >= 0) {
            list[idx] = serverUpdated;
          }
          return {
            ...prev,
            [table]: list as any,
          };
        });

        return serverUpdated;
      } catch (err: any) {
        // 4. Rollback on failure!
        if (previousRecord && targetIndex >= 0) {
          setTables((prev) => {
            const list = [...(prev[table] || [])] as any[];
            list[targetIndex] = previousRecord;
            return {
              ...prev,
              [table]: list as any,
            };
          });
        }

        const errorMsg =
          err?.message || `Failed to update record in ${table}. Changes rolled back.`;
        showToast(errorMsg, 'error');
        throw err;
      }
    },
    [tables, showToast]
  );

  return (
    <OpsHubContext.Provider
      value={{
        tables,
        lists,
        serverDate,
        isLoading,
        isRefreshing,
        error,
        lastSynced,
        config,
        isConfigured,
        toasts,
        showToast,
        removeToast,
        saveConfig,
        clearConfig,
        refresh,
        testConnection,
        createRecord,
        updateRecord,
      }}
    >
      {children}
    </OpsHubContext.Provider>
  );
}

export function useOpsHub(): OpsHubContextType {
  const ctx = useContext(OpsHubContext);
  if (!ctx) {
    throw new Error('useOpsHub must be used within an OpsHubProvider');
  }
  return ctx;
}
