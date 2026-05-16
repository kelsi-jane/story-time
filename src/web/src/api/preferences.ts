export type Theme = 'rose' | 'teal' | 'sage' | 'parchment';

export interface Preferences {
  theme: Theme;
  pinnedPanels: string[];
  unpinnedPanels: string[];  // explicitly unpinned by the user — distinct from "never seen"
}

export interface PanelSectionConfig {
  id: string;
  label: string;
  requiresAuth: boolean;
  defaultPinned: boolean;
}

export const PANEL_SECTION_REGISTRY: PanelSectionConfig[] = [
  { id: 'pick-up',            label: 'Last Read',                  requiresAuth: false, defaultPinned: true },
  { id: 'bookmarks',          label: 'Bookmarks',                  requiresAuth: true,  defaultPinned: true },
  { id: 'favorite-stories',   label: 'Favorite Stories',           requiresAuth: true,  defaultPinned: true },
  { id: 'reading-list',       label: 'Reading List',               requiresAuth: true,  defaultPinned: true },
  { id: 'new-this-week',      label: 'New This Week',              requiresAuth: false, defaultPinned: true },
];

const PREFS_KEY = 'st-preferences';

const ALL_DEFAULTS = PANEL_SECTION_REGISTRY.filter((s) => s.defaultPinned).map((s) => s.id);

export function getPreferences(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Partial<Preferences>;
    const storedPins = stored.pinnedPanels ?? [];
    const unpinned = stored.unpinnedPanels ?? [];
    return {
      theme: stored.theme ?? 'rose',
      unpinnedPanels: unpinned,
      // Auto-add new default sections only if the user hasn't explicitly unpinned them
      pinnedPanels: [
        ...storedPins,
        ...ALL_DEFAULTS.filter((id) => !storedPins.includes(id) && !unpinned.includes(id)),
      ],
    };
  } catch {
    return { theme: 'rose', pinnedPanels: ALL_DEFAULTS, unpinnedPanels: [] };
  }
}

export function savePreferences(p: Preferences, username?: string): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch { /* storage full — fail silently */ }
  if (username) pushPreferences(username, p).catch(() => {});
}

export async function syncPreferences(username: string): Promise<void> {
  try {
    const res = await fetch(`/api/users/${username}/preferences`);
    if (!res.ok) return;
    const remote = await res.json() as Partial<Preferences>;
    const local = getPreferences();
    // Remote wins for explicit choices; re-apply default-merge logic
    const merged: Preferences = {
      theme: remote.theme ?? local.theme,
      unpinnedPanels: remote.unpinnedPanels ?? local.unpinnedPanels,
      pinnedPanels: remote.pinnedPanels ?? local.pinnedPanels,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch { /* network failure — keep local */ }
}

export async function pushPreferences(username: string, p: Preferences): Promise<void> {
  await fetch(`/api/users/${username}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function hasStoredPreferences(): boolean {
  return localStorage.getItem(PREFS_KEY) !== null;
}
