import { useState } from 'react';
import { TabBar } from './ui/components/TabBar';
import type { Tab } from './ui/components/TabBar';
import { TodayScreen } from './ui/screens/TodayScreen';
import { LogScreen } from './ui/screens/LogScreen';
import { HistoryScreen } from './ui/screens/HistoryScreen';
import { InsightsScreen } from './ui/screens/InsightsScreen';
import { ProfileScreen } from './ui/screens/ProfileScreen';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');

  return (
    <div className="app">
      <main className="app-content">
        {activeTab === 'today' && <TodayScreen />}
        {activeTab === 'log' && <LogScreen />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'insights' && <InsightsScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </main>
      <TabBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}

export default App;
