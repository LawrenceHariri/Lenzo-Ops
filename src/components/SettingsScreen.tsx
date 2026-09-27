/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { STORAGE_KEY_CLIENT_ID, STORAGE_KEY_TOKEN, STORAGE_KEY_URL } from '../api';
import { DriveSpreadsheetItem, extractSpreadsheetId } from '../services/googleSheets';
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
    mode,
    setMode,
    sheetConfig,
    config,
    saveConfig,
    connectGoogleSheet,
    createNewGoogleSheet,
    loadDriveSpreadsheetsList,
    testConnection,
    firebaseUser,
    userEmail,
    userName,
    userPhoto,
    signInWithGoogleAuth,
    signOutGoogle,
    hasPin,
    setPin,
    removePin,
    showToast,
  } = useOpsHub();

  const [activeTab, setActiveTab] = useState<'sheets' | 'appscript'>(mode);

  // Google Sheets states
  const [sheetInput, setSheetInput] = useState<string>(sheetConfig?.sheetId || '');
  const [sheetNameInput, setSheetNameInput] = useState<string>(sheetConfig?.sheetName || '');
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetItem[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Apps Script states
  const [url, setUrl] = useState<string>(() => config?.url || '');
  const [token, setToken] = useState<string>(() => config?.token || '');
  const [clientId, setClientId] = useState<string>(() => config?.clientId || '');

  // Connection testing states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // PIN settings state
  const [pinInput, setPinInput] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Load Drive files when picker is toggled
  const handleOpenDrivePicker = async () => {
    setShowDrivePicker(true);
    if (!firebaseUser) return;
    setIsDriveLoading(true);
    try {
      const files = await loadDriveSpreadsheetsList();
      setDriveFiles(files);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load Google Drive spreadsheets', 'error');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSelectDriveFile = async (file: DriveSpreadsheetItem) => {
    setSheetInput(file.id);
    setSheetNameInput(file.name);
    setShowDrivePicker(false);
    setIsSaving(true);
    try {
      await connectGoogleSheet(file.id, file.name);
      if (onClose && isInitialSetup) onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to connect sheet', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!firebaseUser) {
      showToast('Please sign in with Google first', 'info');
      return;
    }
    setIsCreatingSheet(true);
    try {
      const created = await createNewGoogleSheet('Lenzo-Ops Master Data');
      setSheetInput(created.spreadsheetId);
      setSheetNameInput('Lenzo-Ops Master Data');
      if (onClose && isInitialSetup) onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create spreadsheet', 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleConnectSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractSpreadsheetId(sheetInput);
    if (!cleanId) {
      showToast('Please enter a valid Google Spreadsheet ID or URL', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await connectGoogleSheet(cleanId, sheetNameInput || 'Lenzo-Ops Spreadsheet');
      if (onClose && isInitialSetup) onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to connect sheet', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAppsScript = async (e: React.FormEvent) => {
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

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testConnection();
    setTestResult(res);
    setIsTesting(false);
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

  const filteredDriveFiles = driveFiles.filter((f) =>
    f.name.toLowerCase().includes(driveSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 bg-white border border-stone-200 rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight">
              {isInitialSetup ? 'Connect Lenzo Ops Hub' : 'Data & Connection Settings'}
            </h2>
            <p className="text-xs text-stone-500">
              Google Sheets sync, Firebase Auth &amp; PIN Security
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

      {/* Mode Switch Tabs */}
      <div className="flex p-1 bg-stone-100 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('sheets');
            setMode('sheets');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'sheets'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Google Sheets (Native)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('appscript');
            setMode('appscript');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'appscript'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>Google Apps Script</span>
        </button>
      </div>

      {/* Mode 1: Google Sheets Direct */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          {/* Step 1: Firebase Auth Sign In */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Firebase Authentication
              </span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Lenzo-Ops Authorized
              </span>
            </div>

            {firebaseUser ? (
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt={userName || 'User'}
                      className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {(userEmail?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-900 truncate">
                      {userName || userEmail}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">{userEmail}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOutGoogle}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-stone-200 text-center">
                <p className="text-xs text-stone-600">
                  Sign in with your Google account via Firebase Auth to connect directly to Google Sheets in your Google Drive.
                </p>
                <div className="flex justify-center">
                  <GoogleSignInModal forceShow={true} />
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Spreadsheet Selection / Creation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Google Spreadsheet
              </label>

              {sheetConfig?.sheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetConfig.sheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  <span>Open in Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Quick Actions (Create or Browse Drive) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCreateNewSheet}
                disabled={isCreatingSheet || !firebaseUser}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 text-left transition-all flex items-start gap-3 disabled:opacity-50 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  {isCreatingSheet ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold">1-Click Create Master Sheet</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Generates all 12 Lenzo-Ops tabs in Google Drive
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenDrivePicker}
                disabled={!firebaseUser}
                className="p-3 bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-2xl border border-stone-200 text-left transition-all flex items-start gap-3 disabled:opacity-50 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">Browse My Google Drive</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Pick an existing spreadsheet
                  </div>
                </div>
              </button>
            </div>

            {/* Drive File Picker Popup / Drawer */}
            {showDrivePicker && (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Select a Spreadsheet from Google Drive
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDrivePicker(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    placeholder="Search spreadsheets..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                  />
                </div>

                {isDriveLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Searching Google Drive...</span>
                  </div>
                ) : filteredDriveFiles.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4">
                    No spreadsheets found matching your query.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredDriveFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleSelectDriveFile(file)}
                        className="w-full text-left p-2.5 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-800 truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono truncate">
                            ID: {file.id}
                          </div>
                        </div>
                        <span className="text-[11px] text-emerald-600 font-medium shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual URL / ID Input Form */}
            <form onSubmit={handleConnectSheetSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Spreadsheet ID or Google Sheet Link
                </label>
                <input
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit or raw ID"
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  value={sheetNameInput}
                  onChange={(e) => setSheetNameInput(e.target.value)}
                  placeholder="e.g. Lenzo-Ops Master"
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSaving || !sheetInput.trim() || !firebaseUser}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Connect Sheet</span>
                </button>

                {sheetConfig?.sheetId && (
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting || !firebaseUser}
                    className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <RefreshCw className="w-3.5 h-3.5 text-stone-400" />}
                    <span>Test Sync</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mode 2: Google Apps Script Web App (Legacy) */}
      {activeTab === 'appscript' && (
        <form onSubmit={handleSaveAppsScript} className="space-y-4">
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
                placeholder="Secret token from Script Properties"
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Apps Script Config</span>
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Test Connection</span>
            </button>
          </div>
        </form>
      )}

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`mt-4 p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
            testResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {testResult.ok ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Connection verified!</span> All tables and permissions are ready.
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Connection failed:</span> {testResult.error}
              </div>
            </>
          )}
        </div>
      )}

      {/* PIN Security Section */}
      <div className="mt-8 pt-6 border-t border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-stone-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              4-Digit PIN Lock
            </span>
          </div>
          {hasPin ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          ) : (
            <span className="text-[10px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              Disabled
            </span>
          )}
        </div>

        {hasPin ? (
          <div className="flex items-center justify-between bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <div className="text-xs text-stone-600">
              Your app requires a 4-digit PIN upon opening or after 10 minutes in background.
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
          <form onSubmit={handleSavePin} className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
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
                className="w-32 px-3 py-2 text-center text-lg tracking-widest bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
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
            className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            <span>Enable 4-Digit PIN Lock</span>
          </button>
        )}
      </div>
    </div>
  );
};
