import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStories, getAuthors, getAuthor } from '../../api';
import { getAuthUser } from '../../api/auth';
import { getPreferences, PANEL_SECTION_REGISTRY } from '../../api/preferences';
import type { Story, Author } from '../../types';
import ReaderPanel, { type ReaderPanelSection } from '../../components/ReaderPanel';

// TODO: replace with real data from reading history, bookmarks, and favorites APIs
const PLACEHOLDER_SECTIONS: ReaderPanelSection[] = [
  {
    id: 'pick-up',
    heading: 'Pick up where you left off',
    items: [
      { label: 'Chapter 3 · The Silver Thread', href: '/stories/the-silver-thread/chapters/ch1' },
      { label: 'Bookmark · Ch. 1 · Wedding Bells', href: '/stories/the-silver-thread-wedding-bells/chapters/ch2-1' },
    ],
    hasMore: false,
  },
  {
    id: 'favorites',
    heading: 'Favorites',
    items: [
      { label: 'The Silver Thread', href: '/stories/the-silver-thread' },
      { label: 'The Silver Thread: Wedding Bells', href: '/stories/the-silver-thread-wedding-bells' },
    ],
    hasMore: false,
  },
  {
    id: 'reading-list',
    heading: 'Reading List',
    items: [
      { label: 'The Silver Thread: Wedding Bells', href: '/stories/the-silver-thread-wedding-bells' },
      { label: 'The Silver Thread', href: '/stories/the-silver-thread' },
    ],
    hasMore: false,
  },
  {
    id: 'new-this-week',
    heading: 'New This Week',
    items: [
      { label: 'The Silver Thread: Wedding Bells', href: '/stories/the-silver-thread-wedding-bells' },
    ],
    hasMore: false,
  },
];

const Hamburger = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <line x1="2" y1="4.5" x2="16" y2="4.5" />
    <line x1="2" y1="9"   x2="16" y2="9"   />
    <line x1="2" y1="13.5" x2="16" y2="13.5" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="7.5" r="5" />
    <line x1="11.5" y1="11.5" x2="16" y2="16" />
  </svg>
);

const SlidersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="2" y1="4" x2="14" y2="4" />
    <circle cx="10" cy="4" r="1.75" fill="var(--color-surface)" />
    <line x1="2" y1="8" x2="14" y2="8" />
    <circle cx="5" cy="8" r="1.75" fill="var(--color-surface)" />
    <line x1="2" y1="12" x2="14" y2="12" />
    <circle cx="11" cy="12" r="1.75" fill="var(--color-surface)" />
  </svg>
);

export default function Discovery() {
  const [stories, setStories] = useState<Story[]>([]);
  const [authorMap, setAuthorMap] = useState<Map<string, Author>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('Start Your Discovery Here');
  const [authUsername, setAuthUsername] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [panelAtEnd, setPanelAtEnd] = useState(false);
  const prefs = getPreferences();

  useEffect(() => {
    getAuthUser().then(async (user) => {
      if (!user) return;
      setAuthUsername(user.username);
      const author = await getAuthor(user.username);
      const firstName = author?.fullName.trim().split(/\s+/)[0] || user.username;
      setWelcomeName(firstName);
    });

    Promise.all([getStories(), getAuthors()])
      .then(([s, a]) => {
        setStories(s.filter((story) => story.publishedAt !== null));
        setAuthorMap(new Map(a.map((auth) => [auth.githubUsername, auth])));
      })
      .catch(() => setError('This library couldn\'t be loaded. Try reloading the page.'))
      .finally(() => setLoading(false));

    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    // TODO: replace with getReadingEvents() once reading history module is restored
    try {
      const raw = localStorage.getItem('st-reading-events');
      if (raw && (JSON.parse(raw) as unknown[]).length > 0) setBannerTitle('Discover More');
    } catch { /* leave default */ }

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (loading) return (
    <div style={styles.centered}>
      <span style={styles.loadingText}>Loading stories...</span>
    </div>
  );

  if (error) return (
    <div style={styles.centered}>
      <span style={styles.errorText}>{error}</span>
    </div>
  );

  return (
    <>
      {/* Site banner — full screen width */}
      <div className="discovery-banner">
        <div className="discovery-banner-inner">
          <button className="discovery-banner-btn btn-placeholder" aria-label="Menu"><Hamburger /></button>
          <span className="site-banner-logo">Wistful.Me</span>
          {authUsername && welcomeName ? (
            <div className="site-banner-user" ref={profileRef} onClick={() => setMenuOpen((o) => !o)}>
              <span className="site-banner-welcome">Welcome, {welcomeName}</span>
              <img
                src={`https://github.com/${authUsername}.png?size=56`}
                alt={authUsername}
                className="site-banner-avatar"
              />
              {menuOpen && (
                <div className="profile-menu">
                  <Link to="/settings" className="profile-menu-item">Settings</Link>
                  <a
                    href={import.meta.env.DEV ? '/' : '/.auth/logout?post_logout_redirect_uri=/'}
                    className="profile-menu-item"
                  >
                    Sign out
                  </a>
                </div>
              )}
            </div>
          ) : (
            <a
              href={import.meta.env.DEV ? '#' : `/.auth/login/github?post_login_redirect_uri=${encodeURIComponent('/')}`}
              className="site-banner-signin"
            >
              Sign in
            </a>
          )}
        </div>
      </div>

      {/* Quick links banner — 960px */}
      <div className="discovery-section-wrapper">
        <div className="discovery-banner discovery-section-banner">
          <div className="discovery-section-inner">
            <span className="discovery-banner-title">Quick Links</span>
            <Link to="/settings" className="discovery-banner-btn" aria-label="Customize reader panel">
              <SlidersIcon />
            </Link>
          </div>
        </div>
      </div>

      {/* Reader panel — 960px container */}
      <div style={styles.page}>
        <div className={`reader-panel-wrapper${panelAtEnd ? ' at-end' : ''}`}>
          <ReaderPanel
            sections={PLACEHOLDER_SECTIONS.filter((s) => {
              const config = PANEL_SECTION_REGISTRY.find((r) => r.id === s.id);
              if (!config) return false;
              if (config.requiresAuth && !authUsername) return false;
              return prefs.pinnedPanels.includes(s.id);
            })}
            onScrollEdge={setPanelAtEnd}
          />
        </div>
      </div>

      {/* Discover More section banner — 960px */}
      <div className="discovery-section-wrapper">
        <div className="discovery-banner discovery-section-banner">
          <div className="discovery-section-inner">
            <span className="discovery-banner-title">{bannerTitle}</span>
            <button className="discovery-banner-btn" aria-label="Search" hidden><SearchIcon /></button>
          </div>
        </div>
      </div>

      {/* Story grid — 960px container */}
      <div style={styles.storiesContainer}>
        {stories.length === 0 ? (
          <p style={styles.empty}>No stories yet — come back soon.</p>
        ) : (
          <ul style={styles.grid}>
            {stories.map((story) => (
              <li key={story.id} style={styles.card}>
                <Link to={`/stories/${story.slug}`} style={styles.cardLink}>
                  <div style={styles.cardCover} aria-hidden="true" />
                  <div style={styles.cardBody}>
                    <h2 style={styles.cardTitle}>
                      {story.title}
                      {story.subtitle && <span style={styles.cardSubtitle}>: {story.subtitle}</span>}
                    </h2>
                    {story.authorUsername && authorMap.has(story.authorUsername) && (
                      <p className="story-author">by {authorMap.get(story.authorUsername)!.penName}</p>
                    )}
                    {story.description && (
                      <p style={styles.cardDescription}>{story.description}</p>
                    )}
                    <div style={styles.tagRow}>
                      {story.tags.map((tag) => (
                        <span key={tag} style={styles.tag}>{tag}</span>
                      ))}
                    </div>
                    <span style={styles.chapterCount}>
                      {story.chapters.length} {story.chapters.length === 1 ? 'chapter' : 'chapters'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '16px 24px 0',
  },
  storiesContainer: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '16px 24px 48px',
  },
  siteTagline: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 15,
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    marginBottom: 32,
  },
  grid: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 24,
  },
  card: {
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s ease',
  },
  cardLink: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  },
  cardCover: {
    height: 160,
    background: 'var(--color-surface-muted)',
    borderBottom: '1px solid var(--color-border)',
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 15,
    color: 'var(--color-text-primary)',
    lineHeight: 1.3,
  },
  cardSubtitle: {
    fontWeight: 400,
    fontStyle: 'italic',
    color: 'var(--color-text-secondary)',
  },
  cardDescription: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-accent)',
    background: 'var(--color-surface-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    padding: '2px 8px',
    textTransform: 'lowercase',
  },
  chapterCount: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  loadingText: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  errorText: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: 'var(--color-danger)',
  },
  empty: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    marginTop: 64,
  },
};
