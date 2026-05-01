import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '../../components/AdminLayout';
import TagInput from '../../components/TagInput';
import { getStory, updateStory, deleteStory, deleteChapter, reorderChapters } from '../../api';
import type { Story, Chapter } from '../../types';

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
        ...rowStyles.row,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <span {...attributes} {...listeners} style={rowStyles.handle} title="Drag to reorder">⠿</span>
      <span style={rowStyles.order}>{chapter.order}</span>
      <span style={rowStyles.title}>{chapter.title}</span>
      <Link to={`/admin/stories/${storySlug}/chapters/${chapter.id}/edit`} className="btn btn-secondary" style={rowStyles.editBtn}>Edit</Link>
      <button className="btn btn-danger" style={rowStyles.deleteBtn} onClick={handleDelete}>Delete</button>
    </div>
  );
}

const rowStyles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: 4 },
  handle: { cursor: 'grab', color: 'var(--color-border)', fontSize: 18, lineHeight: 1, userSelect: 'none' },
  order: { fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 16, textAlign: 'right' },
  title: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-primary)', flex: 1 },
  editBtn: { fontSize: 12, padding: '4px 10px' },
  deleteBtn: { fontSize: 12, padding: '4px 10px' },
};

export default function StoryEdit() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', description: '', tags: [] as string[], seriesSlug: '', seriesOrder: '' });

  useEffect(() => {
    if (!slug) return;
    getStory(slug).then((s) => {
      if (!s) return;
      setStory(s);
      setChapters(s.chapters.slice().sort((a, b) => a.order - b.order));
      setForm({
        title: s.title,
        subtitle: s.subtitle ?? '',
        description: s.description ?? '',
        tags: s.tags,
        seriesSlug: s.seriesSlug ?? '',
        seriesOrder: s.seriesOrder?.toString() ?? '',
      });
    });
  }, [slug]);

  function set(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSaving(true);
    try {
      const updated = await updateStory(slug, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        description: form.description.trim() || undefined,
        tags: form.tags,
        seriesSlug: form.seriesSlug.trim() || undefined,
        seriesOrder: form.seriesOrder ? parseInt(form.seriesOrder) : undefined,
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

  return (
    <AdminLayout breadcrumb={story.title}>
      <form onSubmit={handleSave} style={styles.form}>
        <div style={styles.titleRow}>
          <h1 style={styles.heading}>{story.title}</h1>
          <div style={styles.titleActions}>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete story</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>

        <div style={styles.fields}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="subtitle">Subtitle <span style={styles.optional}>(optional)</span></label>
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

          <div style={styles.row}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="seriesSlug">Series slug <span style={styles.optional}>(optional)</span></label>
              <input id="seriesSlug" className="input" value={form.seriesSlug} onChange={(e) => set('seriesSlug', e.target.value)} />
            </div>
            <div className="field" style={{ width: 100 }}>
              <label htmlFor="seriesOrder">Order <span style={styles.optional}>(optional)</span></label>
              <input id="seriesOrder" className="input" type="number" min={1} value={form.seriesOrder} onChange={(e) => set('seriesOrder', e.target.value)} />
            </div>
          </div>
        </div>
      </form>

      <div style={styles.divider} />

      <div style={styles.chaptersHeader}>
        <h2 style={styles.subheading}>Chapters</h2>
        <Link to={`/admin/stories/${slug}/chapters/new`} className="btn btn-secondary">+ Add chapter</Link>
      </div>

      {chapters.length === 0 ? (
        <p style={styles.muted}>No chapters yet. <Link to={`/admin/stories/${slug}/chapters/new`}>Add one.</Link></p>
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

const styles: Record<string, React.CSSProperties> = {
  form: {},
  titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32 },
  heading: { fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 22, color: 'var(--color-text-primary)' },
  titleActions: { display: 'flex', gap: 10, flexShrink: 0 },
  fields: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 },
  row: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  optional: { fontWeight: 400, color: 'var(--color-text-secondary)' },
  divider: { height: 1, background: 'var(--color-border)', margin: '40px 0' },
  chaptersHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  subheading: { fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 16, color: 'var(--color-text-primary)' },
  muted: { fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' },
};
