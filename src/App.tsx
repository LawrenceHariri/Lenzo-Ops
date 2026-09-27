/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
} from 'lucide-react';
import { GoogleSignInModal } from './components/GoogleSignInModal';
import { Navigation, NavTab } from './components/Navigation';
import { OnRampScreen } from './components/OnRampScreen';
import { PinPadScreen } from './components/PinPadScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ToastContainer } from './components/ToastContainer';
import {
  leadsDue,
  openSupport,
  overdueTasks,
  sampleFollowUpsDue,
  samplesToShip,
  today,
  todayTasks,
} from './logic';
import { PartnersPage } from './pages/PartnersPage';
import { PipelinePage } from './pages/PipelinePage';
import { SupportPage } from './pages/SupportPage';
import { TasksPage } from './pages/TasksPage';
import { TeamPage } from './pages/TeamPage';
import { TodayPage } from './pages/TodayPage';
import { OpsHubProvider, useOpsHub } from './store';

function MainApp() {
  const {
    sheetConfig,
    isConfigured,
    serverDate,
    tables,
    lastSynced,
    refresh,
    isRefreshing,
    isLoading,
    error,
    isPinLocked,
    hasPin,
    lockWithPin,
    needsGoogleSignIn,
    isUnauthorized,
    unauthorizedEmail,
    userEmail,
  } = useOpsHub();

  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [showSettings, setShowSettings] = useState(false);

  const currentDate = today(serverDate);

  const [hasCompletedOnRampToday, setHasCompletedOnRampToday] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(`opshub.onramp.${currentDate}`) === 'true';
  });

  // Compute navigation badge counts
  const counts = useMemo(() => {
    const overdue = overdueTasks(tables.Tasks, currentDate).length;
    const dueToday = todayTasks(tables.Tasks, currentDate).length;
    const followups = sampleFollowUpsDue(tables.Samples, currentDate).length;
    const toShip = samplesToShip(tables.Samples).length;
    const leads = leadsDue(tables.Leads, currentDate).length;
    const openSupportCount = openSupport(tables.Support).length;

    const openTasksCount = (tables.Tasks || []).filter(
      (t) => !['Done', 'Dropped'].includes((t.Status || '').trim())
    ).length;

    return {
      today: overdue + dueToday + followups,
      tasks: openTasksCount,
      pipeline: toShip + leads,
      support: openSupportCount,
    };
  }, [tables, currentDate]);

  // If unauthorized account was used
  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-4">
        <ToastContainer />
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-rose-200 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900">Not authorised</h2>
            <p className="text-xs text-stone-500">
              Only <strong className="text-stone-800">hariri@lenzohariri.com</strong> has access to this hub.
              {unauthorizedEmail && (
                <span className="block mt-1 font-mono text-rose-600 text-[11px] truncate">
                  ({unauthorizedEmail})
                </span>
              )}
            </p>
          </div>
          <GoogleSignInModal forceShow={true} />
        </div>
      </div>
    );
  }

  // If PIN lock is active, show clean PIN pad before any data
  if (isPinLocked) {
    return (
      <>
        <ToastContainer />
        <PinPadScreen onSuccess={() => {}} />
      </>
    );
  }

  // If not signed in yet with Google
  if (!isConfigured || needsGoogleSignIn) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-4">
        <ToastContainer />
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-5 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center mx-auto font-bold text-lg shadow-sm">
            L
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900">Lenzo Ops Hub</h2>
            <p className="text-xs text-stone-500">
              Sign in with <strong className="text-stone-700">hariri@lenzohariri.com</strong> to access the Google Sheet.
            </p>
          </div>
          <GoogleSignInModal forceShow={true} />
        </div>
      </div>
    );
  }

  // Calm initial loading state while syncing first payload
  if (isLoading && !lastSynced) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold text-base mb-3 shadow-sm animate-pulse">
          L
        </div>
        <p className="text-xs font-medium text-stone-500">Syncing Lenzo Ops Hub...</p>
      </div>
    );
  }

  // If user has not completed morning on-ramp today and Save State records exist
  if (!hasCompletedOnRampToday && (tables['Save State']?.length || 0) > 0) {
    return (
      <>
        <ToastContainer />
        <OnRampScreen onComplete={() => setHasCompletedOnRampToday(true)} />
      </>
    );
  }

  // Last synced format
  const formattedLastSynced = lastSynced
    ? lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-stone-900 flex">
      <ToastContainer />

      {/* Navigation (Sidebar on Desktop, Bottom bar on Mobile) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSettings={() => setShowSettings(true)}
        counts={counts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top utility bar */}
        <header className="sticky top-0 z-30 bg-[#F7F7F5]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between border-b border-stone-200/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 md:hidden">
              Lenzo Ops Hub
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 hidden md:inline">
              Operations Control
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Connected Google Sheet Pill */}
            {sheetConfig?.sheetId && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 shadow-2xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium truncate max-w-[140px]">{sheetConfig.sheetName || 'Lenzo Ops Hub'}</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetConfig.sheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 ml-0.5"
                  title="Open spreadsheet in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Last synced & Refresh button */}
            <div className="flex items-center gap-2 text-xs bg-white border border-stone-200/80 rounded-2xl px-3 py-1.5 text-stone-500 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Last synced:</span>
              <span className="font-mono text-stone-800 font-semibold">
                {formattedLastSynced}
              </span>

              <button
                onClick={() => refresh()}
                disabled={isRefreshing || isLoading}
                title="Refresh from Google Sheet"
                className="ml-0.5 p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isRefreshing || isLoading ? 'animate-spin text-indigo-600' : ''
                  }`}
                />
              </button>
            </div>

            {/* Signed-in Google email badge */}
            {userEmail && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-stone-200/80 text-xs text-stone-600 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-[11px] truncate max-w-[160px]">{userEmail}</span>
              </div>
            )}

            {/* Quick lock with PIN button */}
            {hasPin && (
              <button
                onClick={() => lockWithPin()}
                className="flex p-2 rounded-2xl bg-white border border-stone-200/80 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors shadow-xs"
                title="Lock with PIN"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {/* Quick settings shortcut on desktop */}
            <button
              onClick={() => setShowSettings(true)}
              className="hidden md:flex p-2 rounded-2xl bg-white border border-stone-200/80 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors shadow-xs"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Global error banner if sync fails */}
        {error && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong className="font-semibold">Sync error:</strong> {error}
              </span>
            </div>
            <button
              onClick={() => refresh()}
              className="px-3 py-1 bg-white hover:bg-rose-100 text-rose-800 font-semibold border border-rose-300 rounded-xl transition-colors shrink-0"
            >
              Retry sync
            </button>
          </div>
        )}

        {/* Tab View Container */}
        <main className="flex-1 px-4 sm:px-8 py-6">
          {currentTab === 'today' && (
            <TodayPage onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'tasks' && <TasksPage />}
          {currentTab === 'pipeline' && <PipelinePage />}
          {currentTab === 'team' && <TeamPage />}
          {currentTab === 'partners' && <PartnersPage />}
          {currentTab === 'support' && <SupportPage />}
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <SettingsScreen onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <OpsHubProvider>
      <MainApp />
    </OpsHubProvider>
  );
}
