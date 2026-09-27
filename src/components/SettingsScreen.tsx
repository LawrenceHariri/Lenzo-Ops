/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { SPREADSHEET_ID } from '../api';
import { useOpsHub } from '../store';
import { GoogleSignInModal } from './GoogleSignInModal';

interface SettingsScreenProps {
  onClose?: () => void;
  isInitialSetup?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  isInitialSetup = false,
}) => {
  const {
    userEmail,
    userName,
    userPhoto,
    signOutGoogle,
    hasPin,
    setPin,
    removePin,
    testConnection,
  } = useOpsHub();

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    tabsCount?: number;
    tabs?: string[];
    error?: string;
  } | null>(null);

  // PIN settings state
  const [pinInput, setPinInput] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection();
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    setPinError(null);
    await setPin(pinInput);
    setPinInput('');
    setIsSettingPin(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
              Settings &amp; Connection
            </h2>
            <p className="text-xs text-stone-500">
              Lenzo Ops Hub Google Sheet integration
            </p>
          </div>
        </div>
        {!isInitialSetup && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* 1. Signed-in Email & Account */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Signed-in Account
            </span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Authorized User
            </span>
          </div>

          {userEmail ? (
            <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={userName || 'User'}
                    className="w-9 h-9 rounded-full border border-stone-200 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {(userEmail[0] || 'L').toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-stone-900 truncate">
                    {userName || userEmail}
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono truncate">
                    {userEmail}
                  </div>
                </div>
              </div>

              {/* Sign out */}
              <button
                type="button"
                onClick={signOutGoogle}
                className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-3">
              <p className="text-xs text-stone-600">
                Sign in with the authorized account <code className="font-mono text-emerald-700">hariri@lenzohariri.com</code> to access the Sheet.
              </p>
              <GoogleSignInModal forceShow={true} />
            </div>
          )}
        </div>

        {/* 2. Test Connection (Reads the Sheet and shows the number of tabs) */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Google Sheet Connection
            </span>
            <span className="text-[10px] font-mono text-stone-400 truncate max-w-[150px]">
              ID: {SPREADSHEET_ID.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-stone-200">
            <div>
              <div className="text-xs font-semibold text-stone-900">
                Lenzo Ops Hub Spreadsheet
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                Verifies direct read/write access to Google Sheet tabs
              </div>
            </div>

            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !userEmail}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Test connection</span>
            </button>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs animate-in fade-in ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.ok ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Connection successful!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Found <strong>{testResult.tabsCount || testResult.tabs?.length || 0} tabs</strong> in the spreadsheet:{' '}
                    <span className="font-mono text-[10px] text-emerald-950">
                      {testResult.tabs?.join(', ')}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Connection failed:</span> {testResult.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. 4-Digit PIN Lock */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <Lock className="w-4 h-4 text-stone-600" />
              <span>4-Digit PIN Lock</span>
            </div>
            {hasPin ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            ) : (
              <span className="text-[10px] font-medium text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded-full">
                Disabled
              </span>
            )}
          </div>

          {hasPin ? (
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-stone-200">
              <div className="text-xs text-stone-600">
                Your app is protected by a 4-digit PIN lock on opening and after 10 minutes in background.
              </div>
              <button
                type="button"
                onClick={removePin}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Remove PIN
              </button>
            </div>
          ) : isSettingPin ? (
            <form onSubmit={handleSavePin} className="space-y-3 bg-white p-4 rounded-xl border border-stone-200">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Enter a 4-digit PIN:
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  autoFocus
                  className="w-32 px-3 py-2 text-center text-lg tracking-widest bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
              {pinError && <p className="text-xs text-rose-600">{pinError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-black cursor-pointer"
                >
                  Set PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingPin(false);
                    setPinInput('');
                    setPinError(null);
                  }}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsSettingPin(true)}
              className="w-full py-2.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Enable 4-Digit PIN Lock</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
