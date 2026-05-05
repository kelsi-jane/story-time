import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import TagInput from '../../components/TagInput';
import { createStory, getAuthors } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Author } from '../../types';

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function StoryNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    tags: [] as string[],
    seriesSlug: '',
    seriesOrder: '',
    authorUsername: user?.username ?? '',
  });

  useEffect(() => {
    getAuthors().then(setAuthors);
  }, []);

  function set(field: string, value: string | string[]) {
    if (field === 'authorUsername') setConsentChecked(false);
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
    if (!form.title.trim() || !form.slug.trim() || !form.authorUsername) return;
    if (form.authorUsername !== user?.username && !consentChecked) return;
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
        authorUsername: form.authorUsername,
      });
      navigate(`/admin/stories/${form.slug.trim()}`);
    } finally {
      setSaving(false);
    }
  }

  const selectedAuthor = authors.find((a) => a.githubUsername === form.authorUsername);
  const needsConsent = !!form.authorUsername && form.authorUsername !== user?.username;
  const canSubmit = !!form.authorUsername && (!needsConsent || consentChecked);

  return (
    <AdminLayout breadcrumb="New story">
      <h1 className="admin-page-heading" style={{ marginBottom: 32 }}>New story</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
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
          <label htmlFor="subtitle">Subtitle <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
          <input id="subtitle" className="input" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="e.g. Wedding Bells" />
          <span className="hint">Appears after the title, separated by a colon</span>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="author">Author</label>
          {authors.length <= 1 ? (
            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', padding: '8px 0' }}>
              {selectedAuthor ? (selectedAuthor.penName || selectedAuthor.githubUsername) : (user?.username ?? '—')}
            </p>
          ) : (
            <select
              id="author"
              className="input"
              value={form.authorUsername}
              onChange={(e) => set('authorUsername', e.target.value)}
            >
              {authors.map((a) => (
                <option key={a.githubUsername} value={a.githubUsername}>
                  {a.penName || a.githubUsername}{a.githubUsername === user?.username ? ' (you)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {needsConsent && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            I have permission to publish on behalf of {selectedAuthor?.penName || form.authorUsername}.
          </label>
        )}

        <div className="field">
          <label>Tags</label>
          <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="seriesSlug">Series slug <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
            <input id="seriesSlug" className="input" value={form.seriesSlug} onChange={(e) => set('seriesSlug', e.target.value)} placeholder="e.g. crimson-chronicles" />
          </div>
          <div className="field" style={{ width: 100 }}>
            <label htmlFor="seriesOrder">Order <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
            <input id="seriesOrder" className="input" type="number" min={1} value={form.seriesOrder} onChange={(e) => set('seriesOrder', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <Link to="/admin" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || !canSubmit}>
            {saving ? 'Creating…' : 'Create story'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
