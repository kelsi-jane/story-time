import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStory } from '../../api';
import type { Story } from '../../types';

export default function StoryTitle() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getStory(slug)
      .then((s) => {
        if (!s) setError('This story couldn\'t be found.');
        else setStory(s);
      })
      .catch(() => setError('This story couldn\'t be loaded. Try reloading the page.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={styles.centered}>
      <span style={styles.loadingText}>Loading...</span>
    </div>
  );

  if (error || !story) return (
    <div style={styles.centered}>
      <p style={styles.errorText}>{error ?? 'Something went wrong.'}</p>
      <Link to="/" style={styles.backLink}>← Back to stories</Link>
    </div>
  );

  const firstChapter = story.chapters[0];

  return (
    <div style={styles.page}>
      <Link to="/" style={styles.backLink}>← All stories</Link>

      <div style={styles.cover} aria-hidden="true" />

      <div style={styles.meta}>
        <h1 style={styles.title}>{story.title}</h1>
        {story.subtitle && <p style={styles.subtitle}>{story.subtitle}</p>}

        {story.description && (
          <p style={styles.description}>{story.description}</p>
        )}

        <div style={styles.tagRow}>
          {story.tags.map((tag) => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>

        {firstChapter && (
          <Link to={`/stories/${story.slug}/chapters/${firstChapter.id}`} style={styles.beginButton}>
            Begin reading
          </Link>
        )}
      </div>

      <div style={styles.divider} />

      <section style={styles.tocSection}>
        <h2 style={styles.tocHeading}>Chapters</h2>
        <ol style={styles.tocList}>
          {story.chapters
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((chapter) => (
              <li key={chapter.id} style={styles.tocItem}>
                <Link
                  to={`/stories/${story.slug}/chapters/${chapter.id}`}
                  style={styles.tocLink}
                >
                  <span style={styles.tocNumber}>{chapter.order}</span>
                  <span style={styles.tocTitle}>{chapter.title}</span>
                </Link>
              </li>
            ))}
        </ol>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '48px 24px',
  },
  cover: {
    width: '100%',
    height: 280,
    background: 'var(--color-surface-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    margin: '24px 0 32px',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 28,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.4px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--color-text-secondary)',
    letterSpacing: '-0.2px',
    marginTop: -8,
  },
  description: {
    fontFamily: 'Lora, serif',
    fontSize: 16,
    fontStyle: 'italic',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
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
  beginButton: {
    display: 'inline-block',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-surface)',
    background: 'var(--color-accent)',
    borderRadius: 4,
    padding: '10px 20px',
    textDecoration: 'none',
  },
  divider: {
    height: 1,
    background: 'var(--color-border)',
    margin: '32px 0',
  },
  tocSection: {},
  tocHeading: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 16,
  },
  tocList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  tocItem: {},
  tocLink: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 4,
    textDecoration: 'none',
    color: 'inherit',
  },
  tocNumber: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    minWidth: 16,
    textAlign: 'right',
  },
  tocTitle: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 15,
    color: 'var(--color-text-primary)',
  },
  backLink: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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
};
