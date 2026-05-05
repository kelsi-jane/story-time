import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { migrateStoryAuthors, updateStory, deleteStory } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Story } from '../../types';

export default function AdminIndex() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    migrateStoryAuthors(user.username)
      .then(setStories)
      .finally(() => setLoading(false));
  }, [user?.username]);

  async function togglePublish(story: Story) {
    const updated = await updateStory(story.slug, {
      publishedAt: story.publishedAt ? null : new Date().toISOString(),
    });
    setStories((prev) => prev.map((s) => (s.slug === updated.slug ? updated : s)));
  }

  async function handleDelete(slug: string) {
    if (!confirm('Delete this story? This cannot be undone.')) return;
    await deleteStory(slug);
    setStories((prev) => prev.filter((s) => s.slug !== slug));
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 className="admin-page-heading">Stories</h1>
        <Link to="/admin/stories/new" className="btn btn-primary">+ New story</Link>
      </div>

      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : stories.length === 0 ? (
        <p style={styles.muted}>No stories yet. <Link to="/admin/stories/new">Create one.</Link></p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Title', 'Status', 'Chapters', 'Tags', ''].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stories.map((story) => (
              <tr key={story.id} style={styles.row}>
                <td style={styles.td}>
                  <Link to={`/admin/stories/${story.slug}`} style={styles.storyLink}>
                    {story.title}
                    {story.subtitle && <span style={styles.storySubtitle}>: {story.subtitle}</span>}
                  </Link>
                </td>
                <td style={styles.td}>
                  <span style={story.publishedAt ? styles.published : styles.draft}>
                    {story.publishedAt ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td style={{ ...styles.td, ...styles.numeric }}>{story.chapters.length}</td>
                <td style={styles.td}>
                  <div style={styles.tagRow}>
                    {story.tags.map((t) => (
                      <span key={t} style={styles.tag}>{t}</span>
                    ))}
                  </div>
                </td>
                <td style={{ ...styles.td, ...styles.actions }}>
                  <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => togglePublish(story)}>
                    {story.publishedAt ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn btn-danger" style={styles.actionBtn} onClick={() => handleDelete(story.slug)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
    color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em',
    textAlign: 'left', padding: '0 12px 12px', borderBottom: '1px solid var(--color-border)',
  },
  row: { borderBottom: '1px solid var(--color-border)' },
  td: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-primary)', padding: '14px 12px', verticalAlign: 'middle' },
  numeric: { color: 'var(--color-text-secondary)' },
  storyLink: { color: 'var(--color-text-primary)', fontWeight: 500, textDecoration: 'none' },
  storySubtitle: { fontWeight: 400, color: 'var(--color-text-secondary)', fontStyle: 'italic' },
  published: { fontSize: 12, fontWeight: 500, color: 'var(--color-success)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 8px' },
  draft: { fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 8px' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: { fontSize: 11, color: 'var(--color-accent)', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 6px' },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  actionBtn: { fontSize: 12, padding: '5px 10px' },
  muted: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' },
};
