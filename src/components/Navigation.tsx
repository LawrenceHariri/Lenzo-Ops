/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CalendarCheck,
  CheckSquare,
  ExternalLink,
  FileSpreadsheet,
  GitFork,
  Handshake,
  Headphones,
  Settings,
  Users,
} from 'lucide-react';
import { useOpsHub } from '../store';

export type NavTab =
  | 'today'
  | 'tasks'
  | 'pipeline'
  | 'team'
  | 'partners'
  | 'support';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  counts?: {
    today?: number;
    tasks?: number;
    pipeline?: number;
    support?: number;
  };
}

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: CalendarCheck },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'pipeline', label: 'Pipeline', icon: GitFork },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'partners', label: 'Partners', icon: Handshake },
  { id: 'support', label: 'Support', icon: Headphones },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  counts = {},
}) => {
  const { mode, sheetConfig, userEmail, userName, userPhoto } = useOpsHub();

  return (
    <>
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col justify-between w-64 shrink-0 bg-white border-r border-stone-200/80 p-5 h-screen sticky top-0">
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2 py-2 mb-6">
            <div className="w-9 h-9 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              L
            </div>
            <div>
              <div className="font-semibold text-stone-900 text-base tracking-tight">
                Lenzo Ops Hub
              </div>
              <div className="text-[11px] text-stone-400 font-medium">
                Google Sheets Live Sync
              </div>
            </div>
          </div>

          {/* Connected Sheet Status Pill */}
          {mode === 'sheets' && sheetConfig?.sheetId && (
            <div className="mb-6 px-3 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium text-emerald-900 text-[11px]">
                  {sheetConfig.sheetName || 'Google Sheet'}
                </span>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetConfig.sheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Sheets"
                className="text-emerald-700 hover:text-emerald-900 p-0.5"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Navigation links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const badgeCount =
                item.id === 'today'
                  ? counts.today
                  : item.id === 'tasks'
                  ? counts.tasks
                  : item.id === 'pipeline'
                  ? counts.pipeline
                  : item.id === 'support'
                  ? counts.support
                  : undefined;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-stone-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {typeof badgeCount === 'number' && badgeCount > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom user & settings */}
        <div className="pt-4 border-t border-stone-100 space-y-2">
          {userEmail && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-stone-50 rounded-2xl border border-stone-200/80">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName || 'User'}
                  className="w-6 h-6 rounded-full border border-stone-200 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                  {(userEmail[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-stone-900 truncate">
                  {userName || userEmail}
                </div>
                <div className="text-[10px] text-stone-400 truncate">{userEmail}</div>
              </div>
            </div>
          )}

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-stone-400" />
            <span>Settings &amp; Sheet</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-1.5 flex items-center justify-around safe-bottom"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const badgeCount =
            item.id === 'today'
              ? counts.today
              : item.id === 'tasks'
              ? counts.tasks
              : item.id === 'pipeline'
              ? counts.pipeline
              : item.id === 'support'
              ? counts.support
              : undefined;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors relative min-w-[50px] cursor-pointer ${
                isActive ? 'text-stone-900 font-semibold' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    isActive ? 'text-stone-900 stroke-[2.5]' : 'text-stone-400'
                  }`}
                />
                {typeof badgeCount === 'number' && badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium text-stone-400 hover:text-stone-600 min-w-[50px] cursor-pointer"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 mb-0.5 text-stone-400" />
          <span>Config</span>
        </button>
      </nav>
    </>
  );
};
