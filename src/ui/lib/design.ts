export type Design = 'volt' | 'coffee';

export const DESIGN_OPTIONS: { id: Design; label: string }[] = [
  { id: 'volt', label: 'Volt' },
  { id: 'coffee', label: 'Coffee' },
];

// Mirrored by the inline script in index.html, which applies it before first paint.
const STORAGE_KEY = 'caffeine-tracker-design';
const DEFAULT_DESIGN: Design = 'volt';

export function loadDesign(): Design {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'coffee' ? 'coffee' : DEFAULT_DESIGN;
  } catch {
    // Blocked storage only costs the saved choice, never the app.
    return DEFAULT_DESIGN;
  }
}

/** Switches the design now, and keeps the browser chrome (status bar) matching it. */
export function applyDesign(design: Design): void {
  document.documentElement.dataset.design = design;

  const background = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  if (!background) return;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', background));
}

export function saveDesign(design: Design): void {
  try {
    localStorage.setItem(STORAGE_KEY, design);
  } catch {
    // The design still applies for this session.
  }
  applyDesign(design);
}
