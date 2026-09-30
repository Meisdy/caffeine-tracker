import type { ReactNode } from 'react';

export type Tab = 'today' | 'log' | 'history' | 'insights' | 'profile';

function CoffeeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h12a3 3 0 0 1 0 6h-1" />
      <path d="M4 8v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8" />
      <path d="M8 2c-1 1-1 2 0 3M12 2c-1 1-1 2 0 3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

interface TabDefinition {
  id: Tab;
  label: string;
  icon: ReactNode;
}

const TABS: TabDefinition[] = [
  { id: 'today', label: 'Today', icon: <CoffeeIcon /> },
  { id: 'log', label: 'Log', icon: <PlusIcon /> },
  { id: 'history', label: 'History', icon: <CalendarIcon /> },
  { id: 'insights', label: 'Insights', icon: <TrendingUpIcon /> },
  { id: 'profile', label: 'Profile', icon: <UserIcon /> },
];

interface TabBarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
}

export function TabBar({ activeTab, onSelectTab }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-bar-button ${activeTab === tab.id ? 'is-active' : ''}`}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className="tab-bar-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="tab-bar-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
