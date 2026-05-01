import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStories } from '../../api';
import type { Story } from '../../types';

export default function Discovery() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStories()
      .then(setStories)
      .catch(() => setError('This library couldn\'t be loaded. Try reloading the page.'))
      .finally(() => setLoading(false));
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
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.siteTitle}>Story Time</h1>
        <p style={styles.siteTagline}>Stories worth staying up for.</p>
      </header>

      {stories.length === 0 ? (
        <p style={styles.empty}>No stories yet — come back soon.</p>
      ) : (
        <ul style={styles.grid}>
          {stories.map((story) => (
            <li key={story.id} style={styles.card}>
              <Link to={`/stories/${story.slug}`} style={styles.cardLink}>
                <div style={styles.cardCover} aria-hidden="true" />
                <div style={styles.cardBody}>
                  <h2 style={styles.cardTitle}>{story.title}</h2>
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
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '48px 24px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 48,
  },
  siteTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 32,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.5px',
    marginBottom: 8,
  },
  siteTagline: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 15,
    color: 'var(--color-text-secondary)',
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
