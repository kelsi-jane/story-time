import { useState, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import TagInput from '../../components/TagInput';
import { createStory } from '../../api';

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function StoryNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    tags: [] as string[],
    seriesSlug: '',
    seriesOrder: '',
  });

  function set(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      slug: slugEdited ? prev.slug : toSlug(title),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      await createStory({
        title: form.title.trim(),
        slug: form.slug.trim(),
        subtitle: form.subtitle.trim() || undefined,
        description: form.description.trim() || undefined,
        tags: form.tags,
        seriesSlug: form.seriesSlug.trim() || undefined,
        seriesOrder: form.seriesOrder ? parseInt(form.seriesOrder) : undefined,
        publishedAt: null,
      });
      navigate(`/admin/stories/${form.slug.trim()}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout breadcrumb="New story">
      <h1 style={styles.heading}>New story</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" className="input" value={form.title} onChange={handleTitleChange} required />
        </div>

        <div className="field">
          <label htmlFor="slug">Slug</label>
          <input
            id="slug" className="input" value={form.slug}
            onChange={(e) => { setSlugEdited(true); set('slug', e.target.value); }}
            required
          />
          <span className="hint">URL-safe identifier — auto-generated from title</span>
        </div>

        <div className="field">
          <label htmlFor="subtitle">Subtitle <span style={styles.optional}>(optional)</span></label>
          <input id="subtitle" className="input" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="e.g. Wedding Bells" />
          <span className="hint">Appears after the title, separated by a colon</span>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="field">
          <label>Tags</label>
          <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
        </div>

        <div style={styles.row}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="seriesSlug">Series slug <span style={styles.optional}>(optional)</span></label>
            <input id="seriesSlug" className="input" value={form.seriesSlug} onChange={(e) => set('seriesSlug', e.target.value)} placeholder="e.g. crimson-chronicles" />
          </div>
          <div className="field" style={{ width: 100 }}>
            <label htmlFor="seriesOrder">Order <span style={styles.optional}>(optional)</span></label>
            <input id="seriesOrder" className="input" type="number" min={1} value={form.seriesOrder} onChange={(e) => set('seriesOrder', e.target.value)} />
          </div>
        </div>

        <div style={styles.actions}>
          <Link to="/admin" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create story'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 22, color: 'var(--color-text-primary)', marginBottom: 32 },
  form: { display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 },
  row: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  optional: { fontWeight: 400, color: 'var(--color-text-secondary)' },
  actions: { display: 'flex', gap: 12, paddingTop: 8 },
};
