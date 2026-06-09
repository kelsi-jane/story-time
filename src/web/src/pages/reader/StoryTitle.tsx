import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStory, getAuthor, getBookmarks, getReadingEvents } from '../../api';
import type { Story, Author, Bookmark, Chapter as ChapterType } from '../../types';
import SiteBanner from '../../components/SiteBanner';

export default function StoryTitle() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [lastReadChapter, setLastReadChapter] = useState<ChapterType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getStory(slug)
      .then(async (s) => {
        if (!s) { setError('This story couldn\'t be found.'); return; }
        setStory(s);
        const [a, bm, events] = await Promise.all([
          s.authorUsername ? getAuthor(s.authorUsername) : Promise.resolve(null),
          getBookmarks({ storyId: s.id }),
          getReadingEvents({ storyId: s.id }),
        ]);
        setAuthor(a);
        setBookmark(bm[0] ?? null);
        if (events.length > 0) {
          const latest = [...events].sort((a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
          )[0];
          setLastReadChapter(s.chapters.find((c) => c.id === latest.chapterId) ?? null);
        }
      })
      .catch(() => setError('This story couldn\'t be loaded. Try reloading the page.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={styles.centered}>
      <span style={styles.loadingText}>Loading...</span>
    </div>
  );

  if (error || !story) {
    const isNotFound = !story || error?.includes("couldn't be found");
    return (
      <div className="error-page">
        <div className="error-card">
          <i className={`ti ${isNotFound ? 'ti-book-off' : 'ti-alert-triangle'} error-icon`} />
          <p className="error-label">{isNotFound ? 'not found' : 'something went wrong'}</p>
          <h1 className="admin-page-heading">{isNotFound ? "This story's gone quiet." : "The page wouldn't open."}</h1>
          <p className="error-body">
            {isNotFound
              ? "We couldn't find this story on the shelf. The link may be wrong, or it may have moved."
              : "Something interrupted us on the way here. Give it a moment and try again."}
          </p>
          {isNotFound
            ? <Link to="/content" className="btn btn-secondary error-cta">← back to stories</Link>
            : <button className="btn btn-secondary error-cta" onClick={() => window.location.reload()}>try again</button>
          }
        </div>
      </div>
    );
  }

  const sortedChapters = story.chapters.slice().sort((a, b) => a.order - b.order);
  const firstChapter = sortedChapters[0];
  const bookmarkedChapter = bookmark ? story.chapters.find((c) => c.id === bookmark.chapterId) : null;

  return (
    <>
    <SiteBanner />
    <div style={styles.page}>
      <nav style={styles.breadcrumb}>
        <Link to="/content" style={styles.breadcrumbLink}>Stories</Link>
        <span style={styles.breadcrumbSep}>›</span>
        <span style={styles.breadcrumbCurrent}>{story.title}{story.subtitle ? `: ${story.subtitle}` : ''}</span>
      </nav>

      {story.coverImageUrl ? (
        <img src={story.coverImageUrl} alt={`Cover — ${story.title}`} style={{ ...styles.cover, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={styles.cover} aria-hidden="true" />
      )}

      <div style={styles.meta}>
        <h1 style={styles.title}>{story.title}</h1>
        {story.subtitle && <p style={styles.subtitle}>{story.subtitle}</p>}
        {author && <p className="story-author" style={{ fontSize: 18 }}>by {author.penName}</p>}

        {story.description && (
          <p style={styles.description}>{story.description}</p>
        )}

        <div style={styles.tagRow}>
          {story.tags.map((tag) => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>

        {bookmarkedChapter ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to={`/stories/${story.slug}/chapters/${bookmarkedChapter.id}`} style={styles.beginButton}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z" />
              </svg>
              Chapter {bookmarkedChapter.order} · {bookmarkedChapter.title}
            </Link>
            {firstChapter && firstChapter.id !== bookmarkedChapter.id && (
              <Link to={`/stories/${story.slug}/chapters/${firstChapter.id}`} style={styles.restartLink}>
                Start from the beginning
              </Link>
            )}
          </div>
        ) : lastReadChapter ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to={`/stories/${story.slug}/chapters/${lastReadChapter.id}`} style={styles.beginButton}>
              Continue — Chapter {lastReadChapter.order} · {lastReadChapter.title}
            </Link>
            {firstChapter && firstChapter.id !== lastReadChapter.id && (
              <Link to={`/stories/${story.slug}/chapters/${firstChapter.id}`} style={styles.restartLink}>
                Start from the beginning
              </Link>
            )}
          </div>
        ) : firstChapter && (
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
    </>
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
    aspectRatio: '3/2',
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
    fontStyle: 'italic',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-surface)',
    background: 'var(--color-accent)',
    borderRadius: 4,
    padding: '10px 20px',
    textDecoration: 'none',
  },
  restartLink: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
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
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  breadcrumbLink: {
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
