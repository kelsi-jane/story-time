import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import MarkdownEditor from '../../components/MarkdownEditor';
import { getStory, getChapterContent, createChapter, updateChapter } from '../../api';

export default function ChapterNew() {
  const { slug, chapterId } = useParams<{ slug: string; chapterId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(chapterId);

  const [storyTitle, setStoryTitle] = useState('');
  const [nextOrder, setNextOrder] = useState(1);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getStory(slug).then(async (s) => {
      if (!s) return;
      setStoryTitle(s.title + (s.subtitle ? `: ${s.subtitle}` : ''));
      if (isEdit && chapterId) {
        const ch = s.chapters.find((c) => c.id === chapterId);
        if (ch) {
          setTitle(ch.title);
          const text = await getChapterContent(ch.blobPath);
          setContent(text);
        }
      } else {
        setNextOrder(s.chapters.length + 1);
      }
    }).finally(() => setLoading(false));
  }, [slug, chapterId, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !title.trim()) return;
    setSaving(true);
    try {
      if (isEdit && chapterId) {
        await updateChapter(slug, chapterId, { title: title.trim() }, content);
      } else {
        await createChapter(slug, { title: title.trim(), order: nextOrder }, content);
      }
      navigate(`/admin/stories/${slug}`);
    } finally {
      setSaving(false);
    }
  }

  const breadcrumb = storyTitle
    ? `${storyTitle} / ${isEdit ? 'Edit chapter' : 'New chapter'}`
    : isEdit ? 'Edit chapter' : 'New chapter';

  if (loading) return <AdminLayout breadcrumb={breadcrumb}><p style={styles.muted}>Loading…</p></AdminLayout>;

  return (
    <AdminLayout breadcrumb={breadcrumb}>
      <div style={styles.titleRow}>
        <h1 style={styles.heading}>{isEdit ? 'Edit chapter' : 'New chapter'}</h1>
        {!isEdit && <span style={styles.orderBadge}>Chapter {nextOrder}</span>}
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div className="field" style={{ maxWidth: 400 }}>
          <label htmlFor="chapterTitle">Title</label>
          <input
            id="chapterTitle"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapter title…"
            required
          />
        </div>

        <div className="field">
          <label>Content</label>
          <MarkdownEditor value={content} onChange={setContent} />
        </div>

        <div style={styles.actions}>
          <Link to={`/admin/stories/${slug}`} className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save chapter'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  titleRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 },
  heading: { fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 22, color: 'var(--color-text-primary)' },
  orderBadge: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '3px 10px' },
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  actions: { display: 'flex', gap: 12, paddingTop: 8 },
  muted: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' },
};
