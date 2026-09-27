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
  clearIdToken,
  createRecord as apiCreateRecord,
  getIdToken,
  loadAll as apiLoadAll,
  setIdToken,
  SPREADSHEET_ID,
  STORAGE_KEY_PIN_HASH,
  testConnection as apiTestConnection,
  updateRecord as apiUpdateRecord,
} from './api';
import {
  AUTHORIZED_EMAIL,
  getAccessToken,
  googleSignIn,
  initAuth,
  isAuthorizedEmail,
  logout,
  setCachedAccessToken,
} from './firebase';
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
  Reminders: [],
};

export interface ConnectionTestResult {
  ok: boolean;
  tabsCount?: number;
  tabs?: string[];
  error?: string;
}

interface OpsHubContextType {
  mode: 'sheets';
  sheetConfig: { sheetId: string; sheetName: string };
  tables: TablesData;
  lists: DropdownLists;
  serverDate: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastSynced: Date | null;
  isConfigured: boolean;
  firebaseUser: User | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  hasPin: boolean;
  isPinLocked: boolean;
  needsGoogleSignIn: boolean;
  isUnauthorized: boolean;
  unauthorizedEmail: string | null;
  toasts: ToastItem[];
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;
  signInWithGoogleAuth: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  refresh: () => Promise<void>;
  testConnection: () => Promise<ConnectionTestResult>;
  createRecord: <T extends BaseRecord = BaseRecord>(
    table: TableName,
    data: Record<string, any>
  ) => Promise<T>;
  updateRecord: <T extends BaseRecord = BaseRecord>(
    table: TableName,
    record: T,
    changes: Record<string, any>
  ) => Promise<T>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => void;
  verifyAndUnlockPin: (
    pin: string
  ) => Promise<{ success: boolean; attemptsRemaining?: number }>;
  lockWithPin: () => void;
  // Compatibility fallbacks
  setGoogleCredential: (credential: string) => void;
}

const OpsHubContext = createContext<OpsHubContextType | undefined>(undefined);

export function OpsHubProvider({ children }: { children: React.ReactNode }) {
  const [tables, setTables] = useState<TablesData>(emptyTables);
  const [lists, setLists] = useState<DropdownLists>({});
  const [serverDate, setServerDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Auth state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [needsGoogleSignIn, setNeedsGoogleSignIn] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);

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

  const isFetchingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const backgroundTimeRef = useRef<number | null>(null);

  // Configured if signed in with the authorized account
  const isConfigured = Boolean(firebaseUser && isAuthorizedEmail(userEmail));

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

  // Sign out Google
  const signOutGoogle = useCallback(async () => {
    await logout();
    setFirebaseUser(null);
    setUserEmail(null);
    setUserName(null);
    setUserPhoto(null);
    clearIdToken();
    setTables(emptyTables);
    setLists({});
    setLastSynced(null);
    setIsUnauthorized(false);
    setUnauthorizedEmail(null);
    showToast('Signed out of Google account', 'info');
  }, [showToast]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        if (!isAuthorizedEmail(user.email)) {
          setIsUnauthorized(true);
          setUnauthorizedEmail(user.email || 'Unknown');
          signOutGoogle();
          return;
        }

        setIsUnauthorized(false);
        setUnauthorizedEmail(null);
        setFirebaseUser(user);
        setUserEmail(user.email || null);
        setUserName(user.displayName || null);
        setUserPhoto(user.photoURL || null);
        if (token) {
          setCachedAccessToken(token);
          setIdToken(token);
        }
        setNeedsGoogleSignIn(false);
      },
      (errorMsg) => {
        if (errorMsg === 'Not authorised') {
          setIsUnauthorized(true);
          showToast('Not authorised. Access restricted to hariri@lenzohariri.com', 'error');
        }
        setFirebaseUser(null);
        setUserEmail(null);
        setUserName(null);
        setUserPhoto(null);
        setCachedAccessToken(null);
        clearIdToken();
      }
    );

    return () => unsubscribe();
  }, [signOutGoogle, showToast]);

  // Main data loader
  const fetchData = useCallback(
    async (isBackground = false) => {
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
        const result: AllDataResult = await apiLoadAll();
        setTables(result.tables);
        setLists(result.lists || {});
        if (result.serverDate) setServerDate(result.serverDate);

        const now = new Date();
        setLastSynced(now);
        lastSyncTimeRef.current = now.getTime();
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to sync with Google Sheet';
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
    },
    [showToast]
  );

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Sign in with Google (Firebase Auth)
  const signInWithGoogleAuth = useCallback(async () => {
    try {
      const result = await googleSignIn();

      if (!isAuthorizedEmail(result.user.email)) {
        setIsUnauthorized(true);
        setUnauthorizedEmail(result.user.email || 'Unknown');
        await signOutGoogle();
        showToast('Not authorised. Access is restricted to hariri@lenzohariri.com', 'error');
        return;
      }

      setIsUnauthorized(false);
      setUnauthorizedEmail(null);
      setFirebaseUser(result.user);
      setUserEmail(result.user.email || null);
      setUserName(result.user.displayName || null);
      setUserPhoto(result.user.photoURL || null);
      setNeedsGoogleSignIn(false);
      showToast(`Signed in as ${result.user.email}`, 'success');

      // Sync sheets data
      fetchData(false);
    } catch (err: any) {
      if (err?.message === 'Not authorised') {
        setIsUnauthorized(true);
        showToast('Not authorised. Access is restricted to hariri@lenzohariri.com', 'error');
        return;
      }
      const msg = err?.message || 'Failed to sign in with Google';
      showToast(msg, 'error');
      throw err;
    }
  }, [fetchData, signOutGoogle, showToast]);

  // Initial load when user is verified
  useEffect(() => {
    if (firebaseUser && isAuthorizedEmail(firebaseUser.email)) {
      fetchData(false);
    } else {
      setIsLoading(false);
    }
  }, [firebaseUser, fetchData]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    if (!firebaseUser || !isAuthorizedEmail(firebaseUser.email)) return;
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [firebaseUser, fetchData]);

  // Focus & visibility refresh
  useEffect(() => {
    if (!firebaseUser || !isAuthorizedEmail(firebaseUser.email)) return;
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
  }, [firebaseUser, fetchData]);

  // Test connection
  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    try {
      const res = await apiTestConnection();
      return res;
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'Connection test failed',
      };
    }
  }, []);

  // Create record
  const createRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      data: Record<string, any>
    ): Promise<T> => {
      const prevTableData = (tables[table] || []) as any[];

      try {
        const newRecord = await apiCreateRecord<T>(table, data);
        setTables((prev) => ({
          ...prev,
          [table]: [...(prev[table] as any[]), newRecord],
        }));
        return newRecord;
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
    [tables, showToast]
  );

  // Update record
  const updateRecord = useCallback(
    async <T extends BaseRecord = BaseRecord>(
      table: TableName,
      record: T,
      changes: Record<string, any>
    ): Promise<T> => {
      const prevTableData = (tables[table] || []) as any[];

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

        // Concurrency check requirement: "if not, refresh and show 'Sheet changed — please retry'"
        if (errMsg.includes('Sheet changed — please retry')) {
          showToast('Sheet changed — please retry', 'error');
          // Re-fetch sheet to sync local state
          fetchData(true);
        } else {
          if (/sign\s*in|401|auth/i.test(errMsg)) {
            setNeedsGoogleSignIn(true);
          }
          showToast(errMsg, 'error');
        }

        // Revert optimistic update
        setTables((prev) => ({
          ...prev,
          [table]: prevTableData,
        }));
        throw err;
      }
    },
    [tables, fetchData, showToast]
  );

  // PIN management
  const setPin = useCallback(async (pin: string) => {
    const hash = await hashPin(pin);
    localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
    setHasPin(true);
    setPinAttempts(0);
    showToast('4-digit PIN lock configured', 'success');
  }, [showToast]);

  const removePin = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PIN_HASH);
    setHasPin(false);
    setIsPinLocked(false);
    setPinAttempts(0);
    showToast('PIN lock removed', 'info');
  }, [showToast]);

  const lockWithPin = useCallback(() => {
    if (hasPin) {
      setIsPinLocked(true);
    }
  }, [hasPin]);

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
          setNeedsGoogleSignIn(true);
        }

        return { success: false, attemptsRemaining: remaining };
      }
    },
    [pinAttempts]
  );

  // 10 minutes background watcher
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

  const setGoogleCredential = useCallback(
    (_cred: string) => {
      // Compatibility stub
    },
    []
  );

  const value: OpsHubContextType = {
    mode: 'sheets',
    sheetConfig: {
      sheetId: SPREADSHEET_ID,
      sheetName: 'Lenzo Ops Hub',
    },
    tables,
    lists,
    serverDate,
    isLoading,
    isRefreshing,
    error,
    lastSynced,
    isConfigured,
    firebaseUser,
    userEmail,
    userName,
    userPhoto,
    hasPin,
    isPinLocked,
    needsGoogleSignIn,
    isUnauthorized,
    unauthorizedEmail,
    toasts,
    showToast,
    removeToast,
    signInWithGoogleAuth,
    signOutGoogle,
    refresh,
    testConnection,
    createRecord,
    updateRecord,
    setPin,
    removePin,
    verifyAndUnlockPin,
    lockWithPin,
    setGoogleCredential,
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
