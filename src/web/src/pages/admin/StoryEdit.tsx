import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '../../components/AdminLayout';
import TagInput from '../../components/TagInput';
import { getStory, updateStory, deleteStory, deleteChapter, reorderChapters, getAuthors } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Story, Chapter, Author } from '../../types';

function SortableChapterRow({ chapter, storySlug, onDeleted }: {
  chapter: Chapter;
  storySlug: string;
  onDeleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });

  async function handleDelete() {
    if (!confirm(`Delete "${chapter.title}"?`)) return;
    await deleteChapter(storySlug, chapter.id);
    onDeleted(chapter.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 4, marginBottom: 4,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--color-border)', fontSize: 18, lineHeight: 1, userSelect: 'none' }} title="Drag to reorder">⠿</span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 16, textAlign: 'right' }}>{chapter.order}</span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-primary)', flex: 1 }}>{chapter.title}</span>
      <Link to={`/admin/stories/${storySlug}/chapters/${chapter.id}/edit`} className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>Edit</Link>
      <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={handleDelete}>Delete</button>
    </div>
  );
}

export default function StoryEdit() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [saving, setSaving] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    tags: [] as string[],
    seriesSlug: '',
    seriesOrder: '',
    authorUsername: '',
  });

  useEffect(() => {
    if (!slug) return;
    Promise.all([getStory(slug), getAuthors()]).then(([s, a]) => {
      if (!s) return;
      setStory(s);
      setAuthors(a);
      setChapters(s.chapters.slice().sort((a, b) => a.order - b.order));
      setForm({
        title: s.title,
        subtitle: s.subtitle ?? '',
        description: s.description ?? '',
        tags: s.tags,
        seriesSlug: s.seriesSlug ?? '',
        seriesOrder: s.seriesOrder?.toString() ?? '',
        authorUsername: s.authorUsername ?? user?.username ?? '',
      });
    });
  }, [slug]);

  function set(field: string, value: string | string[]) {
    if (field === 'authorUsername') setConsentChecked(false);
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !story) return;
    if (form.authorUsername !== user?.username && !consentChecked) return;
    setSaving(true);
    try {
      const updated = await updateStory(slug, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        description: form.description.trim() || undefined,
        tags: form.tags,
        seriesSlug: form.seriesSlug.trim() || undefined,
        seriesOrder: form.seriesOrder ? parseInt(form.seriesOrder) : undefined,
        ...(story.publishedAt === null ? { authorUsername: form.authorUsername } : {}),
      });
      setStory(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!slug || !confirm('Delete this story and all its chapters? This cannot be undone.')) return;
    await deleteStory(slug);
    navigate('/admin');
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !slug) return;
    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex).map((c, i) => ({ ...c, order: i + 1 }));
    setChapters(reordered);
    await reorderChapters(slug, reordered.map((c) => c.id));
  }

  if (!story) return null;

  const isPublished = story.publishedAt !== null;
  const selectedAuthor = authors.find((a) => a.githubUsername === form.authorUsername);
  const needsConsent = !!form.authorUsername && form.authorUsername !== user?.username;

  return (
    <AdminLayout breadcrumb={story.title}>
      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
          <h1 className="admin-page-heading">{story.title}</h1>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete story</button>
            <button type="submit" className="btn btn-primary" disabled={saving || (needsConsent && !consentChecked)}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="subtitle">Subtitle <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
            <input id="subtitle" className="input" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="e.g. Wedding Bells" />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="field">
            <label>Tags</label>
            <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
          </div>

          <div className="field">
            <label htmlFor="author">Author</label>
            {isPublished ? (
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', padding: '8px 0', fontStyle: 'italic' }}>
                {selectedAuthor?.penName || form.authorUsername}
                <span style={{ fontSize: 12, marginLeft: 8 }}>(locked after publish)</span>
              </p>
            ) : authors.length <= 1 ? (
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

          {!isPublished && needsConsent && (
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

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="seriesSlug">Series slug <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
              <input id="seriesSlug" className="input" value={form.seriesSlug} onChange={(e) => set('seriesSlug', e.target.value)} />
            </div>
            <div className="field" style={{ width: 100 }}>
              <label htmlFor="seriesOrder">Order <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span></label>
              <input id="seriesOrder" className="input" type="number" min={1} value={form.seriesOrder} onChange={(e) => set('seriesOrder', e.target.value)} />
            </div>
          </div>
        </div>
      </form>

      <hr className="admin-divider" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="admin-subheading">Chapters</h2>
        <Link to={`/admin/stories/${slug}/chapters/new`} className="btn btn-secondary">+ Add chapter</Link>
      </div>

      {chapters.length === 0 ? (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          No chapters yet. <Link to={`/admin/stories/${slug}/chapters/new`}>Add one.</Link>
        </p>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {chapters.map((chapter) => (
              <SortableChapterRow
                key={chapter.id}
                chapter={chapter}
                storySlug={slug!}
                onDeleted={(id) => setChapters((prev) => prev.filter((c) => c.id !== id))}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </AdminLayout>
  );
}
