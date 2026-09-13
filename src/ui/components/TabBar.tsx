export type Tab = 'today' | 'log' | 'history' | 'insights' | 'profile';

interface TabDefinition {
  id: Tab;
  label: string;
  icon: string;
}

const TABS: TabDefinition[] = [
  { id: 'today', label: 'Today', icon: '☕' },
  { id: 'log', label: 'Log', icon: '➕' },
  { id: 'history', label: 'History', icon: '\u{1F4C5}' },
  { id: 'insights', label: 'Insights', icon: '\u{1F4C8}' },
  { id: 'profile', label: 'Profile', icon: '\u{1F464}' },
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
