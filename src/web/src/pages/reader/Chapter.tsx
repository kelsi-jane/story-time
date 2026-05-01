import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getStory, getChapterContent } from '../../api';
import type { Story, Chapter as ChapterType } from '../../types';

export default function Chapter() {
  const { slug, chapterId } = useParams<{ slug: string; chapterId: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !chapterId) return;

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

  if (loading) return (
    <div style={styles.centered}>
      <span style={styles.loadingText}>Loading content...</span>
    </div>
  );

  if (error || !story || !chapter || content === null) return (
    <div style={styles.centered}>
      <p style={styles.errorText}>{error ?? 'Something went wrong.'}</p>
      <Link to={`/stories/${slug}`} style={styles.navLink}>← Back to story</Link>
    </div>
  );

  const sorted = story.chapters.slice().sort((a, b) => a.order - b.order);
  const currentIndex = sorted.findIndex((c) => c.id === chapterId);
  const prev = sorted[currentIndex - 1];
  const next = sorted[currentIndex + 1];

  return (
    <div style={styles.page}>
      <nav style={styles.topNav}>
        <Link to={`/stories/${story.slug}`} style={styles.navLink}>
          ← {story.title}
        </Link>
      </nav>

      <article style={styles.article}>
        <header style={styles.articleHeader}>
          <p style={styles.chapterLabel}>Chapter {chapter.order}</p>
          <h1 style={styles.chapterTitle}>{chapter.title}</h1>
        </header>

        <div style={styles.prose} className="prose">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </article>

      <footer style={styles.chapterNav}>
        <div style={styles.chapterNavInner}>
          {prev ? (
            <Link to={`/stories/${story.slug}/chapters/${prev.id}`} style={styles.navLink}>
              ← {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/stories/${story.slug}/chapters/${next.id}`} style={{ ...styles.navLink, textAlign: 'right' }}>
              {next.title} →
            </Link>
          ) : (
            <Link to={`/stories/${story.slug}`} style={{ ...styles.navLink, textAlign: 'right' }}>
              Finished — back to story
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  topNav: {
    marginBottom: 48,
  },
  article: {},
  articleHeader: {
    marginBottom: 40,
  },
  chapterLabel: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  chapterTitle: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 26,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
  },
  prose: {
    fontFamily: 'Lora, serif',
    fontSize: 17,
    lineHeight: 1.8,
    color: 'var(--color-text-primary)',
    // Prose child element spacing applied via className in a real stylesheet;
    // inline styles can't target descendants, so we rely on the global reset
    // being permissive and ReactMarkdown's default p wrapping.
  },
  chapterNav: {
    marginTop: 64,
    borderTop: '1px solid var(--color-border)',
    paddingTop: 24,
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
