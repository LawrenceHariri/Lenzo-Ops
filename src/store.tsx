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
import { User } from 'firebase/auth';
import {
  clearConnectionConfig,
  clearIdToken,
  clearSheetConfig,
  createRecord as apiCreateRecord,
  getConnectionConfig,
  getConnectionMode,
  getIdToken,
  getSheetConfig,
  loadAll,
  saveConnectionConfig,
  saveSheetConfig,
  setConnectionMode,
  setIdToken,
  STORAGE_KEY_CLIENT_ID,
  STORAGE_KEY_PIN_HASH,
  updateRecord as apiUpdateRecord,
  ConnectionMode,
} from './api';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
  setCachedAccessToken,
} from './firebase';
import {
  appendRowToSheet,
  createLenzoSpreadsheet,
  DriveSpreadsheetItem,
  listDriveSpreadsheets,
  readAllTablesFromSheet,
  updateRowInSheet,
} from './services/googleSheets';
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
  mode: ConnectionMode;
  setMode: (mode: ConnectionMode) => void;
  sheetConfig: { sheetId: string; sheetName: string } | null;
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
  firebaseUser: User | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  hasPin: boolean;
  isPinLocked: boolean;
  needsGoogleSignIn: boolean;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;
  saveConfig: (url: string, token: string, clientId?: string) => Promise<boolean>;
  clearConfig: () => void;
  connectGoogleSheet: (sheetId: string, sheetName?: string) => Promise<boolean>;
  createNewGoogleSheet: (title?: string) => Promise<{ spreadsheetId: string; spreadsheetUrl: string }>;
  loadDriveSpreadsheetsList: () => Promise<DriveSpreadsheetItem[]>;
  signInWithGoogleAuth: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
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
  setPin: (pin: string) => Promise<void>;
  removePin: () => void;
  verifyAndUnlockPin: (
    pin: string
  ) => Promise<{ success: boolean; attemptsRemaining?: number }>;
  lockWithPin: () => void;
}

const OpsHubContext = createContext<OpsHubContextType | undefined>(undefined);

export function OpsHubProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ConnectionMode>(() => getConnectionMode());
  const [sheetConfig, setSheetConfig] = useState<{ sheetId: string; sheetName: string } | null>(
    () => getSheetConfig()
  );
  const [config, setConfig] = useState<{ url: string; token: string; clientId: string } | null>(
    () => getConnectionConfig()
  );

  const [tables, setTables] = useState<TablesData>(emptyTables);
  const [lists, setLists] = useState<DropdownLists>({});
  const [serverDate, setServerDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [idTokenState, setIdTokenState] = useState<string>(() => getIdToken());
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
  const isFetchingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const backgroundTimeRef = useRef<number | null>(null);

  const isConfigured =
    mode === 'sheets'
      ? Boolean(sheetConfig?.sheetId)
      : Boolean(config?.url && config?.token);

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

  const setMode = useCallback((newMode: ConnectionMode) => {
    setModeState(newMode);
    setConnectionMode(newMode);
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setFirebaseUser(user);
        setUserEmail(user.email || null);
        setUserName(user.displayName || null);
        setUserPhoto(user.photoURL || null);
        if (token) {
          setCachedAccessToken(token);
          setIdToken(token);
          setIdTokenState(token);
        }
        setNeedsGoogleSignIn(false);
      },
      () => {
        setFirebaseUser(null);
        setUserEmail(null);
        setUserName(null);
        setUserPhoto(null);
        setCachedAccessToken(null);
        clearIdToken();
        setIdTokenState('');
      }
    );

    return () => unsubscribe();
  }, []);

  // Sign in with Google (Firebase Auth)
  const signInWithGoogleAuth = useCallback(async () => {
    try {
      const result = await googleSignIn();
      setFirebaseUser(result.user);
      setUserEmail(result.user.email || null);
      setUserName(result.user.displayName || null);
      setUserPhoto(result.user.photoURL || null);
      setIdToken(result.accessToken);
      setIdTokenState(result.accessToken);
      setNeedsGoogleSignIn(false);
      showToast(`Signed in as ${result.user.email}`, 'success');
      // Trigger sync
      fetchData(true);
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in with Google';
      showToast(msg, 'error');
      throw err;
    }
  }, [showToast]);

  // Sign out Google
  const signOutGoogle = useCallback(async () => {
    await logout();
    setFirebaseUser(null);
    setUserEmail(null);
    setUserName(null);
    setUserPhoto(null);
    clearIdToken();
    setIdTokenState('');
    showToast('Signed out of Google account', 'info');
  }, [showToast]);

  // Backwards compatibility for setGoogleCredential
  const setGoogleCredential = useCallback(
    (credential: string) => {
      setIdToken(credential);
      setIdTokenState(credential);
      setNeedsGoogleSignIn(false);
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
        if (parsed?.email) setUserEmail(parsed.email);
        if (parsed?.name) setUserName(parsed.name);
      } catch {}
      fetchData(true);
    },
    []
  );

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
          clearIdToken();
          setIdTokenState('');
          setNeedsGoogleSignIn(true);
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
            setIsPinLocked(true);
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Main data fetcher
  const fetchData = useCallback(
    async (isBackground = false) => {
      const currentMode = getConnectionMode();

      if (currentMode === 'sheets') {
        const sheet = getSheetConfig();
        if (!sheet?.sheetId) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        const token = await getAccessToken();
        if (!token) {
          setIsLoading(false);
          setIsRefreshing(false);
          setNeedsGoogleSignIn(true);
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
          const result = await readAllTablesFromSheet(sheet.sheetId, token);
          setTables(result.tables);
          setLists(result.lists || {});
          if (result.serverDate) setServerDate(result.serverDate);

          const now = new Date();
          setLastSynced(now);
          lastSyncTimeRef.current = now.getTime();
        } catch (err: any) {
          const errMsg = err?.message || 'Failed to sync with Google Sheets';
          setError(errMsg);
          if (/401|auth|sign\s*in|credential/i.test(errMsg)) {
            setNeedsGoogleSignIn(true);
          }
          showToast(errMsg, 'error');
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
          isFetchingRef.current = false;
        }
      } else {
        // Apps Script mode
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
          if (result.serverDate) setServerDate(result.serverDate);
          if (result.user?.email) setUserEmail(result.user.email);

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

  // Periodic refresh every 5 minutes
  useEffect(() => {
    if (!isConfigured) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isConfigured, fetchData]);

  // Focus & visibility refresh
  useEffect(() => {
    if (!isConfigured) return;
    const handleFocusOrVisible = () => {
      const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
      if (document.visibilityState === 'visible' && timeSinceLastSync > 30 * 1000) {
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

  // Connect Google Sheet
  const connectGoogleSheet = useCallback(
    async (newSheetId: string, sheetName = 'Lenzo Ops Master'): Promise<boolean> => {
      saveSheetConfig(newSheetId, sheetName);
      setSheetConfig({ sheetId: newSheetId, sheetName });
      setMode('sheets');
      setError(null);
      await fetchData(false);
      showToast(`Connected to Google Sheet "${sheetName}"`, 'success');
      return true;
    },
    [setMode, fetchData, showToast]
  );

  // Create New Google Sheet in Drive
  const createNewGoogleSheet = useCallback(
    async (title = 'Lenzo-Ops Master Data'): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
      const token = await getAccessToken();
      if (!token) {
        setNeedsGoogleSignIn(true);
        throw new Error('Please sign in with Google to create a spreadsheet in your Google Drive.');
      }

      showToast('Creating Lenzo Ops Google Sheet...', 'info');
      const result = await createLenzoSpreadsheet(token, title);
      saveSheetConfig(result.spreadsheetId, title);
      setSheetConfig({ sheetId: result.spreadsheetId, sheetName: title });
      setMode('sheets');
      await fetchData(false);
      showToast('Google Sheet created and synced successfully!', 'success');
      return result;
    },
    [setMode, fetchData, showToast]
  );

  // List user spreadsheets from Drive
  const loadDriveSpreadsheetsList = useCallback(async (): Promise<DriveSpreadsheetItem[]> => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsGoogleSignIn(true);
      throw new Error('Please sign in with Google to list spreadsheets.');
    }
    return await listDriveSpreadsheets(token);
  }, []);

  // Save Apps Script config
  const saveConfig = useCallback(
    async (newUrl: string, newToken: string, newClientId?: string): Promise<boolean> => {
      saveConnectionConfig(newUrl, newToken, newClientId);
      const conf = getConnectionConfig();
      setConfig(conf);
      setMode('appscript');
      setError(null);
      await fetchData(false);
      showToast('Settings saved successfully', 'success');
      return true;
    },
    [setMode, fetchData, showToast]
  );

  // Clear config
  const clearConfig = useCallback(() => {
    clearConnectionConfig();
    clearSheetConfig();
    setConfig(null);
    setSheetConfig(null);
    setTables(emptyTables);
    setLists({});
    setServerDate(new Date().toISOString().slice(0, 10));
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
        if (mode === 'sheets') {
          const sheet = getSheetConfig();
          const token = await getAccessToken();
          if (!sheet?.sheetId || !token) {
            return { ok: false, error: 'Sign in with Google and select a Sheet' };
          }
          await readAllTablesFromSheet(sheet.sheetId, token);
          return { ok: true };
        } else {
          const conf = getConnectionConfig();
          const urlToUse = testUrl || conf?.url;
          const tokenToUse = testToken || conf?.token;
          if (!urlToUse || !tokenToUse) {
            return { ok: false, error: 'URL and Token are required' };
          }
          await loadAll({ url: urlToUse, token: tokenToUse, idToken: testIdToken });
          return { ok: true };
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Connection test failed';
        if (/sign\s*in/i.test(errMsg)) {
          setNeedsGoogleSignIn(true);
        }
        return { ok: false, error: errMsg };
      }
    },
    [mode]
  );

  // Create record
  const createRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      data: Record<string, any>
    ): Promise<T> => {
      const prevTableData = tables[table] || [];

      try {
        if (mode === 'sheets') {
          const sheet = getSheetConfig();
          const token = await getAccessToken();
          if (!sheet?.sheetId || !token) {
            throw new Error('Google Sheet connection or authorization is missing.');
          }

          const newRecord = (await appendRowToSheet(
            sheet.sheetId,
            table,
            data,
            token
          )) as T;

          setTables((prev) => ({
            ...prev,
            [table]: [...(prev[table] as any[]), newRecord],
          }));
          return newRecord;
        } else {
          const newRecord = await apiCreateRecord<T>(table, data);
          setTables((prev) => ({
            ...prev,
            [table]: [...(prev[table] as any[]), newRecord],
          }));
          return newRecord;
        }
      } catch (err: any) {
        const errMsg = err?.message || `Failed to create record in ${table}`;
        if (/sign\s*in|401|auth/i.test(errMsg)) {
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
    [mode, tables, showToast]
  );

  // Update record
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
        if (mode === 'sheets') {
          const sheet = getSheetConfig();
          const token = await getAccessToken();
          if (!sheet?.sheetId || !token) {
            throw new Error('Google Sheet connection or authorization is missing.');
          }

          const updated = (await updateRowInSheet(
            sheet.sheetId,
            table,
            record._row,
            changes,
            token
          )) as T;

          setTables((prev) => ({
            ...prev,
            [table]: (prev[table] as any[]).map((r) =>
              r._row === record._row ? updated : r
            ),
          }));
          return updated;
        } else {
          const updatedRecord = await apiUpdateRecord<T>(table, record, changes);
          setTables((prev) => ({
            ...prev,
            [table]: (prev[table] as any[]).map((r) =>
              r._row === record._row ? updatedRecord : r
            ),
          }));
          return updatedRecord;
        }
      } catch (err: any) {
        const errMsg = err?.message || `Failed to update record in ${table}`;
        if (/sign\s*in|401|auth/i.test(errMsg)) {
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
    [mode, tables, showToast]
  );

  const value = {
    mode,
    setMode,
    sheetConfig,
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
    firebaseUser,
    userEmail,
    userName,
    userPhoto,
    hasPin,
    isPinLocked,
    needsGoogleSignIn,
    toasts,
    showToast,
    removeToast,
    saveConfig,
    clearConfig,
    connectGoogleSheet,
    createNewGoogleSheet,
    loadDriveSpreadsheetsList,
    signInWithGoogleAuth,
    signOutGoogle,
    refresh,
    testConnection,
    createRecord,
    updateRecord,
    setGoogleCredential,
    setPin,
    removePin,
    verifyAndUnlockPin,
    lockWithPin,
  };

  return <OpsHubContext.Provider value={value}>{children}</OpsHubContext.Provider>;
}

export function useOpsHub(): OpsHubContextType {
  const context = useContext(OpsHubContext);
  if (!context) {
    throw new Error('useOpsHub must be used within an OpsHubProvider');
  }
  return context;
}
