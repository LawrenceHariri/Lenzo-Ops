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
  clearIdToken,
  createRecord as apiCreateRecord,
  getConnectionConfig,
  getIdToken,
  loadAll,
  saveConnectionConfig,
  setIdToken,
  STORAGE_KEY_CLIENT_ID,
  STORAGE_KEY_PIN_HASH,
  updateRecord as apiUpdateRecord,
} from './api';
import {
  AllDataResult,
  BaseRecord,
  DropdownLists,
  TableName,
  TablesData,
} from './types';
import { hashPin, verifyPin } from './utils/pin';

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
  Projects: [],
  'Coach Config': [],
  'Coach Notes': [],
};

interface OpsHubContextType {
  tables: TablesData;
  lists: DropdownLists;
  serverDate: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastSynced: Date | null;
  config: { url: string; token: string; clientId: string } | null;
  isConfigured: boolean;
  clientId: string;
  idToken: string;
  userEmail: string | null;
  hasPin: boolean;
  isPinLocked: boolean;
  needsGoogleSignIn: boolean;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;
  saveConfig: (url: string, token: string, clientId?: string) => Promise<boolean>;
  clearConfig: () => void;
  refresh: () => Promise<void>;
  testConnection: (
    testUrl?: string,
    testToken?: string,
    testIdToken?: string
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
  setGoogleCredential: (credential: string) => void;
  signOutGoogle: () => void;
  setPin: (pin: string) => Promise<void>;
  removePin: () => void;
  verifyAndUnlockPin: (
    pin: string
  ) => Promise<{ success: boolean; attemptsRemaining?: number }>;
  lockWithPin: () => void;
}

const OpsHubContext = createContext<OpsHubContextType | undefined>(undefined);

export function OpsHubProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<{ url: string; token: string; clientId: string } | null>(
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

  // Google Sign-in state (in-memory token only)
  const [idTokenState, setIdTokenState] = useState<string>(() => getIdToken());
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [needsGoogleSignIn, setNeedsGoogleSignIn] = useState(false);

  // PIN Lock state
  const [hasPin, setHasPin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(STORAGE_KEY_PIN_HASH));
  });
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(STORAGE_KEY_PIN_HASH));
  });
  const [pinAttempts, setPinAttempts] = useState<number>(0);

  const clientId = config?.clientId || '';
  const isConfigured = Boolean(config?.url && config?.token);
  const isFetchingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const backgroundTimeRef = useRef<number | null>(null);

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

  // Set Google ID Token credential
  const setGoogleCredential = useCallback(
    (credential: string) => {
      setIdToken(credential);
      setIdTokenState(credential);
      setNeedsGoogleSignIn(false);

      // Attempt to decode email from JWT payload
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const parsed = JSON.parse(jsonPayload);
        if (parsed?.email) {
          setUserEmail(parsed.email);
        }
      } catch {
        // Ignored
      }

      showToast('Signed in with Google', 'success');
      // Re-sync with the new credential
      fetchData(true);
    },
    [showToast]
  );

  // Sign out Google
  const signOutGoogle = useCallback(() => {
    clearIdToken();
    setIdTokenState('');
    setUserEmail(null);
    try {
      (window as any).google?.accounts?.id?.disableAutoSelect?.();
    } catch {}
    showToast('Signed out from Google', 'info');
  }, [showToast]);

  // Set PIN
  const setPin = useCallback(async (pin: string) => {
    const hash = await hashPin(pin);
    localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
    setHasPin(true);
    setPinAttempts(0);
    showToast('4-digit PIN lock configured', 'success');
  }, [showToast]);

  // Remove PIN
  const removePin = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PIN_HASH);
    setHasPin(false);
    setIsPinLocked(false);
    setPinAttempts(0);
    showToast('PIN lock removed', 'info');
  }, [showToast]);

  // Lock app manually
  const lockWithPin = useCallback(() => {
    if (hasPin) {
      setIsPinLocked(true);
    }
  }, [hasPin]);

  // Verify and unlock PIN
  const verifyAndUnlockPin = useCallback(
    async (pin: string): Promise<{ success: boolean; attemptsRemaining?: number }> => {
      const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
      if (!storedHash) {
        setIsPinLocked(false);
        return { success: true };
      }

      const match = await verifyPin(pin, storedHash);
      if (match) {
        setIsPinLocked(false);
        setPinAttempts(0);
        return { success: true };
      } else {
        const nextAttempts = pinAttempts + 1;
        setPinAttempts(nextAttempts);
        const remaining = Math.max(0, 5 - nextAttempts);

        if (nextAttempts >= 5) {
          // 5 wrong tries -> require Google sign-in again
          clearIdToken();
          setIdTokenState('');
          setUserEmail(null);
          setNeedsGoogleSignIn(true);
          try {
            (window as any).google?.accounts?.id?.disableAutoSelect?.();
          } catch {}
        }

        return { success: false, attemptsRemaining: remaining };
      }
    },
    [pinAttempts]
  );

  // 10 minutes background lock watcher
  useEffect(() => {
    const handleVisibility = () => {
      const pinExists = Boolean(localStorage.getItem(STORAGE_KEY_PIN_HASH));
      if (!pinExists) return;

      if (document.visibilityState === 'hidden') {
        backgroundTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed > 10 * 60 * 1000) {
            // > 10 minutes in background
            setIsPinLocked(true);
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
          Projects: result.tables?.Projects || [],
          'Coach Config': result.tables?.['Coach Config'] || [],
          'Coach Notes': result.tables?.['Coach Notes'] || [],
        };

        setTables(populatedTables);
        setLists(result.lists || {});
        if (result.serverDate) {
          setServerDate(result.serverDate);
        }
        if (result.user?.email) {
          setUserEmail(result.user.email);
        }

        const now = new Date();
        setLastSynced(now);
        lastSyncTimeRef.current = now.getTime();
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to sync with Google Sheet';
        setError(errMsg);
        if (/sign\s*in/i.test(errMsg)) {
          setNeedsGoogleSignIn(true);
        }
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

  // Tab focus & visibility change refresh (throttled)
  useEffect(() => {
    if (!isConfigured) return;

    const handleFocusOrVisible = () => {
      const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
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

  // Save config
  const saveConfig = useCallback(
    async (newUrl: string, newToken: string, newClientId?: string): Promise<boolean> => {
      saveConnectionConfig(newUrl, newToken, newClientId);
      const conf = getConnectionConfig();
      setConfig(conf);
      setError(null);
      await fetchData(false);
      showToast('Settings saved successfully', 'success');
      return true;
    },
    [fetchData, showToast]
  );

  // Clear config
  const clearConfig = useCallback(() => {
    clearConnectionConfig();
    setConfig(null);
    setTables(emptyTables);
    setLists({});
    setServerDate('');
    setLastSynced(null);
    setError(null);
    showToast('Configuration cleared', 'info');
  }, [showToast]);

  // Test connection
  const testConnection = useCallback(
    async (
      testUrl?: string,
      testToken?: string,
      testIdToken?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const conf = getConnectionConfig();
        const urlToUse = testUrl || conf?.url;
        const tokenToUse = testToken || conf?.token;
        if (!urlToUse || !tokenToUse) {
          return { ok: false, error: 'URL and Token are required' };
        }
        await loadAll({ url: urlToUse, token: tokenToUse, idToken: testIdToken });
        return { ok: true };
      } catch (err: any) {
        const errMsg = err?.message || 'Connection test failed';
        if (/sign\s*in/i.test(errMsg)) {
          setNeedsGoogleSignIn(true);
        }
        return { ok: false, error: errMsg };
      }
    },
    []
  );

  // Optimistic createRecord
  const createRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      data: Record<string, any>
    ): Promise<T> => {
      const prevTableData = tables[table] || [];

      try {
        const newRecord = await apiCreateRecord<T>(table, data);
        setTables((prev) => ({
          ...prev,
          [table]: [...(prev[table] as any[]), newRecord],
        }));
        return newRecord;
      } catch (err: any) {
        const errMsg = err?.message || `Failed to create record in ${table}`;
        if (/sign\s*in/i.test(errMsg)) {
          setNeedsGoogleSignIn(true);
        }
        showToast(errMsg, 'error');
        setTables((prev) => ({
          ...prev,
          [table]: prevTableData,
        }));
        throw err;
      }
    },
    [tables, showToast]
  );

  // Optimistic updateRecord
  const updateRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      record: T,
      changes: Record<string, any>
    ): Promise<T> => {
      const prevTableData = tables[table] || [];

      // Optimistic update
      setTables((prev) => ({
        ...prev,
        [table]: (prev[table] as any[]).map((r) =>
          r._row === record._row ? { ...r, ...changes } : r
        ),
      }));

      try {
        const updatedRecord = await apiUpdateRecord<T>(table, record, changes);
        setTables((prev) => ({
          ...prev,
          [table]: (prev[table] as any[]).map((r) =>
            r._row === record._row ? updatedRecord : r
          ),
        }));
        return updatedRecord;
      } catch (err: any) {
        const errMsg = err?.message || `Failed to update record in ${table}`;
        if (/sign\s*in/i.test(errMsg)) {
          setNeedsGoogleSignIn(true);
        }
        showToast(errMsg, 'error');
        setTables((prev) => ({
          ...prev,
          [table]: prevTableData,
        }));
        throw err;
      }
    },
    [tables, showToast]
  );

  const value = {
    tables,
    lists,
    serverDate,
    isLoading,
    isRefreshing,
    error,
    lastSynced,
    config,
    isConfigured,
    clientId,
    idToken: idTokenState,
    userEmail,
    hasPin,
    isPinLocked,
    needsGoogleSignIn,
    toasts,
    showToast,
    removeToast,
    saveConfig,
    clearConfig,
    refresh,
    testConnection,
    createRecord,
    updateRecord,
    setGoogleCredential,
    signOutGoogle,
    setPin,
    removePin,
    verifyAndUnlockPin,
    lockWithPin,
  };

  return (
    <OpsHubContext.Provider value={value}>{children}</OpsHubContext.Provider>
  );
}

export function useOpsHub(): OpsHubContextType {
  const context = useContext(OpsHubContext);
  if (!context) {
    throw new Error('useOpsHub must be used within an OpsHubProvider');
  }
  return context;
}
