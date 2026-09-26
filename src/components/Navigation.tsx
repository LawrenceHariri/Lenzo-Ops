/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CalendarCheck,
  CheckSquare,
  GitFork,
  Handshake,
  Headphones,
  Settings,
  Users,
} from 'lucide-react';

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
  return (
    <>
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col justify-between w-64 shrink-0 bg-white border-r border-stone-200/80 p-5 h-screen sticky top-0">
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2 py-2 mb-8">
            <div className="w-9 h-9 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              L
            </div>
            <div>
              <div className="font-semibold text-stone-900 text-base tracking-tight">
                Lenzo Ops Hub
              </div>
              <div className="text-[11px] text-stone-400 font-medium">
                Founder Operations
              </div>
            </div>
          </div>

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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
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
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <Settings className="w-4 h-4 text-stone-400" />
            <span>Settings</span>
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
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors relative min-w-[50px] ${
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
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium text-stone-400 hover:text-stone-600 min-w-[50px]"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 mb-0.5 text-stone-400" />
          <span>Config</span>
        </button>
      </nav>
    </>
  );
};
