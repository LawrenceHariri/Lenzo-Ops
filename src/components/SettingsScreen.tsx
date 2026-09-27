/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  User,
  XCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { STORAGE_KEY_CLIENT_ID, STORAGE_KEY_TOKEN, STORAGE_KEY_URL } from '../api';
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
    config,
    saveConfig,
    testConnection,
    userEmail,
    idToken,
    signOutGoogle,
    hasPin,
    setPin,
    removePin,
    showToast,
  } = useOpsHub();

  const [url, setUrl] = useState<string>(() => {
    return (
      config?.url ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_URL) || ''
        : '')
    );
  });

  const [token, setToken] = useState<string>(() => {
    return (
      config?.token ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_TOKEN) || ''
        : '')
    );
  });

  const [clientId, setClientId] = useState<string>(() => {
    return (
      config?.clientId ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY_CLIENT_ID) || ''
        : '')
    );
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  // PIN settings state
  const [pinInput, setPinInput] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const originAddress =
    typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyOrigin = () => {
    if (!originAddress) return;
    navigator.clipboard.writeText(originAddress);
    setCopiedOrigin(true);
    showToast('App address copied to clipboard', 'info');
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleTestConnection = async () => {
    const trimmedUrl = url.trim();
    const trimmedToken = token.trim();

    if (!trimmedUrl) {
      setTestResult({ ok: false, error: 'Please enter the API URL first' });
      return;
    }
    if (!trimmedToken) {
      setTestResult({ ok: false, error: 'Please enter the API Token first' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testConnection(trimmedUrl, trimmedToken);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedToken = token.trim();
    const trimmedClientId = clientId.trim();

    if (!trimmedUrl || !trimmedToken) {
      setTestResult({
        ok: false,
        error: 'Both API URL and API Token are required.',
      });
      return;
    }

    setIsSaving(true);
    const success = await saveConfig(trimmedUrl, trimmedToken, trimmedClientId);
    setIsSaving(false);
    if (success && onClose) {
      onClose();
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
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
              {isInitialSetup ? 'Connect to Lenzo Ops Hub' : 'Settings'}
            </h2>
            <p className="text-xs text-stone-500">
              Connection, Google Auth &amp; PIN Security
            </p>
          </div>
        </div>
        {!isInitialSetup && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Field 1: API URL */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
            API URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://script.google.com/macros/s/.../exec"
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Stored locally in <code className="text-stone-600 font-mono">opshub.url</code>
          </p>
        </div>

        {/* Field 2: API Token */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
            API Token
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTestResult(null);
              }}
              placeholder="Secret token from Script Properties"
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Stored locally in <code className="text-stone-600 font-mono">opshub.token</code>
          </p>
        </div>

        {/* Field 3: Google Client ID */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
            Google Client ID (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Shield className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Stored locally in <code className="text-stone-600 font-mono">opshub.clientId</code>
          </p>
        </div>

        {/* App address for Google Cloud setup */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              This app&apos;s address (for Google Cloud setup)
            </div>
            <div className="font-mono text-stone-800 truncate text-[11px] mt-0.5">
              {originAddress}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyOrigin}
            className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-semibold border border-stone-200 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            {copiedOrigin ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Google Sign-In Status / Action in Settings */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Google Account
          </div>

          {userEmail ? (
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-stone-800 truncate">
                    {userEmail}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Google identity active
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={signOutGoogle}
                className="px-3 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 font-semibold border border-stone-200 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3 h-3 text-stone-500" />
                <span>Sign out</span>
              </button>
            </div>
          ) : clientId ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-500">
                Sign in to attach your Google credential to requests:
              </p>
              <GoogleSignInModal forceShow={true} />
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">
              Google sign-in not active (add Client ID above to enable).
            </p>
          )}
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${
              testResult.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {testResult.ok ? 'Connection successful!' : 'Connection failed'}
              </p>
              {testResult.ok ? (
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  ✅ Connected via POST request with token.
                </p>
              ) : (
                <p className="text-[11px] text-rose-700 mt-0.5 break-all">
                  {testResult.error}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !url.trim() || !token.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 transition-colors"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Testing...
              </>
            ) : (
              'Test connection'
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving || !url.trim() || !token.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-stone-900 hover:bg-black disabled:opacity-50 text-white shadow-md transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Save & Connect'
            )}
          </button>
        </div>
      </form>

      {/* PIN Security Section */}
      <div className="mt-6 pt-5 border-t border-stone-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-stone-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              PIN Lock Security
            </h3>
          </div>
          {hasPin && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          )}
        </div>

        <p className="text-xs text-stone-500">
          Require a 4-digit PIN when opening the app or after 10 minutes in the background.
        </p>

        {hasPin && !isSettingPin ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingPin(true)}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
            >
              Change PIN
            </button>
            <button
              type="button"
              onClick={removePin}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Remove PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSavePin} className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinInput(val);
                  setPinError(null);
                }}
                placeholder="4-digit PIN"
                className="w-32 px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono tracking-widest text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={pinInput.length !== 4}
                className="px-4 py-2 bg-stone-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                {hasPin ? 'Update PIN' : 'Set PIN'}
              </button>
              {isSettingPin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingPin(false);
                    setPinInput('');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
              )}
            </div>
            {pinError && (
              <p className="text-xs text-rose-600">{pinError}</p>
            )}
            <p className="text-[11px] text-stone-400">
              Only a SHA-256 hash is saved locally in <code className="text-stone-600 font-mono">opshub.pinHash</code>.
            </p>
          </form>
        )}
      </div>

      {/* 1-Week Pilot: Last 7 Days of Clarity Ratings */}
      <div className="mt-6 pt-5 border-t border-stone-100 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              1-Week Pilot: Clarity Ratings
            </h3>
            <p className="text-[11px] text-stone-400">
              Morning On-Ramp ratings (stored in localStorage)
            </p>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            Last 7 days
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
          {Array.from({ length: 7 }, (_, i) => {
            const offset = 6 - i;
            const d = new Date();
            d.setDate(d.getDate() - offset);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
            const dayNum = d.getDate();

            const savedRatingStr = typeof window !== 'undefined' ? localStorage.getItem(`opshub.clarity.${dateStr}`) : null;
            const rating = savedRatingStr ? Number(savedRatingStr) : null;

            return (
              <div
                key={dateStr}
                className="flex flex-col items-center justify-between p-2 rounded-xl bg-white border border-stone-200 text-center space-y-2"
                title={`${dayName} ${dayNum}: ${rating ? `${rating} / 5 stars` : 'Not rated'}`}
              >
                <div className="text-[10px] font-semibold text-stone-500 uppercase">
                  {dayName}
                </div>
                <div className="text-[11px] font-mono text-stone-400">
                  {dayNum}
                </div>

                <div className="pt-1 flex items-center justify-center">
                  {rating ? (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                        rating >= 4
                          ? 'bg-emerald-500'
                          : rating === 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      {rating}
                    </div>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
