import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteBanner from '../../components/SiteBanner';
import {
  PANEL_SECTION_REGISTRY,
  getPreferences,
  savePreferences,
  syncPreferences,
  applyTheme,
  type Theme,
} from '../../api/preferences';
import { useAuth } from '../../context/AuthContext';

const THEMES: { id: Theme; label: string; accent: string }[] = [
  { id: 'rose',      label: 'Rose',      accent: '#db2777' },
  { id: 'teal',      label: 'Teal',      accent: '#0d7a7a' },
  { id: 'sage',      label: 'Sage',      accent: '#6b8c6d' },
  { id: 'parchment', label: 'Parchment', accent: '#956040' },
];

export default function Settings() {
  const { user } = useAuth();
  const isAuthenticated = user !== null;
  const [prefs, setPrefs] = useState(getPreferences);

  useEffect(() => {
    if (!user) return;
    syncPreferences(user.username).then(() => {
      const p = getPreferences();
      setPrefs(p);
      applyTheme(p.theme);
    });
  }, [user?.username]);

  function handleTheme(theme: Theme) {
    const updated = { ...prefs, theme };
    setPrefs(updated);
    savePreferences(updated, user?.username);
    applyTheme(theme);
  }

  function handleTogglePanel(id: string, currentlyPinned: boolean) {
    const updated = currentlyPinned
      ? {
          ...prefs,
          pinnedPanels: prefs.pinnedPanels.filter((p) => p !== id),
          unpinnedPanels: [...prefs.unpinnedPanels, id],
        }
      : {
          ...prefs,
          pinnedPanels: [...prefs.pinnedPanels, id],
          unpinnedPanels: prefs.unpinnedPanels.filter((p) => p !== id),
        };
    setPrefs(updated);
    savePreferences(updated, user?.username);
  }

  return (
    <>
    <SiteBanner />
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link to="/content" style={styles.back}>Stories</Link>
        <span style={styles.breadcrumbSep}>›</span>
        <span style={styles.breadcrumbCurrent}>Reading Preferences</span>
      </nav>

      <h1 className="admin-page-heading" style={{ marginBottom: 40 }}>Reading Preferences</h1>

      {/* Color scheme */}
      <section style={styles.section}>
        <h2 className="admin-subheading" style={{ marginBottom: 4 }}>Color scheme</h2>
        <p style={styles.hint}>Changes apply immediately across the whole site.</p>
        <hr className="admin-divider" style={{ margin: '16px 0 24px' }} />
        <div className="theme-swatches">
          {THEMES.map((t) => (
            <div key={t.id} style={styles.swatchWrap}>
              <button
                className={`theme-swatch${prefs.theme === t.id ? ' active' : ''}`}
                style={{ background: t.accent }}
                onClick={() => handleTheme(t.id)}
                aria-label={t.label}
                aria-pressed={prefs.theme === t.id}
              />
              <span style={styles.swatchLabel}>{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Panel sections */}
      <section style={styles.section}>
        <h2 className="admin-subheading" style={{ marginBottom: 4 }}>Reader panel</h2>
        <p style={styles.hint}>Choose which cards appear in your quick-access panel on the home page.</p>
        <hr className="admin-divider" style={{ margin: '16px 0' }} />
        <div>
          {PANEL_SECTION_REGISTRY.map((config) => {
            const locked = config.requiresAuth && !isAuthenticated;
            const pinned = prefs.pinnedPanels.includes(config.id);
            return (
              <div key={config.id} className="settings-panel-row">
                <span className={`settings-panel-label${locked ? ' locked' : ''}`}>
                  {locked && <span className="settings-panel-lock">🔒</span>}
                  {config.label}
                </span>
                {locked ? (
                  <Link
                    to={`/.auth/login/github?post_login_redirect_uri=${encodeURIComponent('/settings')}`}
                    className="settings-panel-signin"
                  >
                    Sign in to unlock
                  </Link>
                ) : (
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={() => handleTogglePanel(config.id, pinned)}
                    aria-label={`Show ${config.label}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  back: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  breadcrumbSep: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-border)',
  },
  breadcrumbCurrent: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-primary)',
  },
  section: {
    marginBottom: 48,
  },
  hint: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    marginTop: 4,
  },
  swatchWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  swatchLabel: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    color: 'var(--color-text-secondary)',
  },
};
