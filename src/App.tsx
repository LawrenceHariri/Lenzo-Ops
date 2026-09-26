/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Navigation, NavTab } from './components/Navigation';
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
    isConfigured,
    serverDate,
    tables,
    lastSynced,
    refresh,
    isRefreshing,
    isLoading,
    error,
  } = useOpsHub();

  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [showSettings, setShowSettings] = useState(false);

  const currentDate = today(serverDate);

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

  // If credentials are not configured, show initial setup screen
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4">
        <ToastContainer />
        <SettingsScreen isInitialSetup={true} />
      </div>
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
