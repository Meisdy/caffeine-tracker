import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { initializeDatabase } from './data/database';
import { requestPersistentStorage } from './data/persistence';
import App from './App';
import './styles/theme.css';
import './styles/app.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element "#root" not found.');
}

const root = createRoot(rootElement);
root.render(<div className="splash">Loading…</div>);

try {
  // A failed registration (unsupported browser, blocked storage, etc.) must
  // never prevent the app itself from loading.
  registerSW({ immediate: true });
} catch {
  // Offline-first app; service worker is an enhancement, not a requirement.
}

// Asked for early and not awaited: a refusal is expected outside installed
// apps, and the tracker works the same either way.
void requestPersistentStorage();

initializeDatabase()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize the database', error);
    root.render(<div className="splash splash-error">Could not load your data. Try reloading the app.</div>);
  });
