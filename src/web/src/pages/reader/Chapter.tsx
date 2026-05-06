import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useSwipeable } from 'react-swipeable';
import { getStory, getChapterContent } from '../../api';
import type { Story, Chapter as ChapterType } from '../../types';

export default function Chapter() {
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Capture enter direction once on mount — drives the slide-in animation
  const [enterClass] = useState<string>(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from === 'right') return 'page-enter-right';
    if (from === 'left')  return 'page-enter-left';
    return '';
  });

  useEffect(() => {
    if (!slug || !chapterId) return;
    setLoading(true);
    setContent(null);

    getStory(slug)
      .then(async (s) => {
        if (!s) { setError('This story couldn\'t be found.'); return; }
        const ch = s.chapters.find((c) => c.id === chapterId);
        if (!ch) { setError('This chapter couldn\'t be found.'); return; }
        setStory(s);
        setChapter(ch);
        const text = await getChapterContent(ch.blobPath);
        setContent(text);
      })
      .catch(() => setError('This content couldn\'t be loaded. Try reloading the page.'))
      .finally(() => setLoading(false));
  }, [slug, chapterId]);

  const sorted = story?.chapters.slice().sort((a, b) => a.order - b.order) ?? [];
  const currentIndex = sorted.findIndex((c) => c.id === chapterId);
  const prev = sorted[currentIndex - 1];
  const next = sorted[currentIndex + 1];

  const swipeHandlers = useSwipeable({
    onSwipedLeft:  () => next && navigate(`/stories/${slug}/chapters/${next.id}`, { state: { from: 'right' } }),
    onSwipedRight: () => prev && navigate(`/stories/${slug}/chapters/${prev.id}`, { state: { from: 'left' } }),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  if (loading) return (
    <div style={styles.outer}>
      <div style={styles.inner}>
        <div className="page-card" style={styles.loadingCard}>
          <span style={styles.loadingText}>Loading content...</span>
        </div>
      </div>
    </div>
  );

  if (error || !story || !chapter || content === null) return (
    <div style={styles.outer}>
      <div style={styles.inner}>
        <div className="page-card" style={styles.loadingCard}>
          <p style={styles.errorText}>{error ?? 'Something went wrong.'}</p>
          <Link to={`/stories/${slug}`} style={styles.navLink}>← Back to story</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.outer}>
      <div style={styles.inner}>
        <nav style={styles.topNav}>
          <Link to={`/stories/${story.slug}`} style={styles.navLink}>
            ← {story.title}{story.subtitle ? `: ${story.subtitle}` : ''}
          </Link>
        </nav>

        <div
          key={chapterId}
          className={`page-card ${enterClass}`}
          {...swipeHandlers}
        >
          <header style={styles.articleHeader}>
            <p style={styles.chapterLabel}>Chapter {chapter.order}</p>
            <h1 style={styles.chapterTitle}>{chapter.title}</h1>
            <div style={styles.rule} />
          </header>

          <div
            className="prose"
            style={styles.prose}
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          <footer style={styles.chapterNav}>
            <div style={styles.chapterNavInner}>
              {prev ? (
                <Link
                  to={`/stories/${story.slug}/chapters/${prev.id}`}
                  state={{ from: 'left' }}
                  style={styles.navLink}
                >
                  ← {prev.title}
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  to={`/stories/${story.slug}/chapters/${next.id}`}
                  state={{ from: 'right' }}
                  style={{ ...styles.navLink, textAlign: 'right' }}
                >
                  {next.title} →
                </Link>
              ) : (
                <Link
                  to={`/stories/${story.slug}`}
                  style={{ ...styles.navLink, textAlign: 'right' }}
                >
                  Finished — back to story
                </Link>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outer: {
    minHeight: '100vh',
    background: 'var(--color-background)',
    padding: '32px 16px 80px',
  },
  inner: {
    maxWidth: 700,
    margin: '0 auto',
  },
  topNav: {
    marginBottom: 20,
  },
  articleHeader: {
    marginBottom: 40,
  },
  chapterLabel: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 10,
  },
  chapterTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 24,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
    marginBottom: 20,
  },
  rule: {
    height: 1,
    background: 'var(--color-border)',
    width: 48,
  },
  prose: {
    fontFamily: 'Lora, serif',
    fontSize: 17,
    lineHeight: 1.85,
    color: 'var(--color-text-primary)',
  },
  chapterNav: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1px solid var(--color-border)',
  },
  chapterNavInner: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
  },
  navLink: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  loadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    gap: 16,
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
