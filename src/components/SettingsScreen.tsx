/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  KeyRound,
  Link2,
  Loader2,
  XCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { STORAGE_KEY_TOKEN, STORAGE_KEY_URL } from '../api';
import { useOpsHub } from '../store';

interface SettingsScreenProps {
  onClose?: () => void;
  isInitialSetup?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onClose,
  isInitialSetup = false,
}) => {
  const { config, saveConfig, testConnection } = useOpsHub();

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

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    if (!trimmedUrl || !trimmedToken) {
      setTestResult({
        ok: false,
        error: 'Both API URL and API Token are required.',
      });
      return;
    }

    setIsSaving(true);
    const success = await saveConfig(trimmedUrl, trimmedToken);
    setIsSaving(false);
    if (success && onClose) {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
              {isInitialSetup ? 'Connect to Lenzo Ops Hub' : 'Connection Settings'}
            </h2>
            <p className="text-xs text-stone-500">
              Google Apps Script Web App attached to Google Sheet
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
              placeholder="Enter your security token"
              required
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Stored locally in <code className="text-stone-600 font-mono">opshub.token</code>
          </p>
        </div>

        {/* Test result banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">
                {testResult.ok ? 'Connection successful ✅' : 'Connection failed ❌'}
              </div>
              {testResult.error && (
                <div className="mt-1 text-rose-800 break-words font-mono">
                  {testResult.error}
                </div>
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

      <div className="mt-6 pt-4 border-t border-stone-100 flex items-start gap-2 text-stone-400 text-xs">
        <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Calls use <code className="text-stone-600 font-mono">redirect: &quot;follow&quot;</code> and <code className="text-stone-600 font-mono">Content-Type: text/plain;charset=utf-8</code>.
        </span>
      </div>
    </div>
  );
};
