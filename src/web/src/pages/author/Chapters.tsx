import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteBanner from '../../components/SiteBanner';
import ProjectSidebar from '../../components/author/ProjectSidebar';
import { getProjection, appendEvent } from '../../api/planning';
import type { ProjectChapter, Projection } from '../../types';

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

export default function Chapters() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem(`sidebar-collapsed-${projectId}`) === 'true'
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const loadProjection = useCallback(async () => {
    if (!projectId) return;
    const p = await getProjection(projectId);
    setProjection(p);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadProjection(); }, [loadProjection]);

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(`sidebar-collapsed-${projectId}`, String(next));
      return next;
    });
  }

  async function handleAddConfirm() {
    const title = newTitle.trim();
    if (!projectId || !title) return;
    const chapterId = genId('ch');
    const boardBlockId = genId('blk');
    await appendEvent(projectId, { type: 'ChapterCreated', payload: { chapterId, title, boardBlockId } });
    setAdding(false);
    setNewTitle('');
    await loadProjection();
  }

  function handleAddCancel() {
    setAdding(false);
    setNewTitle('');
  }

  async function handleRename(ch: ProjectChapter) {
    const trimmed = editTitle.trim();
    setEditingId(null);
    if (!projectId || !trimmed || trimmed === ch.title) return;
    await appendEvent(projectId, { type: 'ChapterRenamed', payload: { chapterId: ch.id, title: trimmed } });
    await loadProjection();
  }

  async function handleDelete(chapterId: string) {
    if (!projectId) return;
    await appendEvent(projectId, { type: 'ChapterDeleted', payload: { chapterId } });
    await loadProjection();
  }

  async function handleDrop(toChapterId: string) {
    if (!projectId || !dragId || dragId === toChapterId || !projection) return;
    const sorted = [...projection.chapters].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(c => c.id === dragId);
    const toIdx = sorted.findIndex(c => c.id === toChapterId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await appendEvent(projectId, { type: 'ChapterReordered', payload: { orderedChapterIds: reordered.map(c => c.id) } });
    setDragId(null);
    setDragOverId(null);
    await loadProjection();
  }

  async function handlePromote(blockId: string, title: string) {
    if (!projectId) return;
    const chapterId = genId('ch');
    await appendEvent(projectId, { type: 'ChapterPromoted', payload: { chapterId, title, boardBlockId: blockId } });
    await loadProjection();
  }

  async function handleArchive(blockId: string) {
    if (!projectId) return;
    await appendEvent(projectId, { type: 'BlockStatusChanged', payload: { blockId, status: 'archived' } });
    await loadProjection();
  }

  if (loading || !projection) return (
    <div className="board-page-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading…</span>
    </div>
  );

  const sortedChapters = [...projection.chapters].sort((a, b) => a.order - b.order);
  const linkedBlockIds = new Set(projection.chapters.map(c => c.boardBlockId).filter(Boolean));
  const unassigned = projection.blocks.filter(
    b => b.boardSlot === 'chapters' && b.status !== 'archived' && !linkedBlockIds.has(b.id)
  );
  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived').length;

  return (
    <div className="board-page-shell">
      <SiteBanner />
      <div className="board-app">
        <ProjectSidebar meta={projection.meta} blockCount={activeBlocks} collapsed={sidebarCollapsed} />
        <button
          className="board-sidebar-toggle"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`ti ti-chevron-${sidebarCollapsed ? 'right' : 'left'}`} />
        </button>

        <div className="board-main">
          <div className="board-toolbar">
            <nav className="board-toolbar-breadcrumb">
              <Link to="/author" className="author-breadcrumb-link">Author Studio</Link>
              <span className="author-breadcrumb-sep">/</span>
              <Link to={`/author/projects/${projectId}`} className="author-breadcrumb-link">{projection.meta.title}</Link>
              <span className="author-breadcrumb-sep">/</span>
              <span className="author-breadcrumb-current">chapters</span>
            </nav>
            <div className="board-toolbar-divider" />
            <button
              className="board-toolbar-btn"
              onClick={() => { setAdding(true); setNewTitle(''); }}
              disabled={adding}
            >
              <i className="ti ti-plus" /> New chapter
            </button>
          </div>

          <div className="chapter-page-body">
            <div className="outline-slot chapter-slot">
              <div className="outline-slot-header outline-slot-color-0">
                {unassigned.length > 0 ? <span>Official Chapters</span> : <span>{projection.meta.title}</span>}
                <span className="outline-slot-num">{sortedChapters.length} {sortedChapters.length === 1 ? 'chapter' : 'chapters'}</span>
              </div>

              {sortedChapters.length === 0 && !adding && (
                <p className="chapter-list-empty">No chapters yet — add one above.</p>
              )}

              {sortedChapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  className={`chapter-row${dragOverId === ch.id && dragId !== ch.id ? ' drag-over' : ''}${dragId === ch.id ? ' dragging' : ''}`}
                  draggable={editingId !== ch.id}
                  onDragStart={() => setDragId(ch.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  onDragOver={e => { e.preventDefault(); setDragOverId(ch.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => handleDrop(ch.id)}
                >
                  <i className="ti ti-grip-vertical chapter-row-handle" />
                  <span className="chapter-row-num">{idx + 1}</span>

                  {editingId === ch.id ? (
                    <input
                      ref={editInputRef}
                      className="chapter-row-input"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => handleRename(ch)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : ch.boardBlockId ? (
                    <Link
                      to={`/author/projects/${projectId}/blocks/${ch.boardBlockId}`}
                      className="chapter-row-title"
                      draggable={false}
                    >
                      {ch.title}
                    </Link>
                  ) : (
                    <span className="chapter-row-title">{ch.title}</span>
                  )}

                  <div className="chapter-row-actions">
                    <button
                      className="chapter-row-action"
                      title="Rename"
                      onClick={e => { e.stopPropagation(); setEditingId(ch.id); setEditTitle(ch.title); }}
                    >
                      <i className="ti ti-pencil" />
                    </button>
                    <button
                      className="chapter-row-action"
                      title="Remove from chapter list (board note is kept)"
                      onClick={e => { e.stopPropagation(); handleDelete(ch.id); }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
              ))}

              {adding && (
                <div className="chapter-add-row">
                  <input
                    className="chapter-add-input"
                    placeholder="Chapter title…"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddConfirm();
                      if (e.key === 'Escape') handleAddCancel();
                    }}
                    autoFocus
                  />
                  <button
                    className="chapter-add-confirm"
                    onClick={handleAddConfirm}
                    disabled={!newTitle.trim()}
                  >
                    Add
                  </button>
                  <button className="chapter-add-cancel" onClick={handleAddCancel}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              )}
            </div>

            {unassigned.length > 0 && (
              <div className="outline-slot chapter-slot">
                <div className="outline-slot-header outline-slot-color-5">
                  <span>From Brainstorm Board</span>
                  <span className="outline-slot-num">{unassigned.length}</span>
                </div>
                {unassigned.map(b => (
                  <div key={b.id} className="chapter-unassigned-item">
                    <span className={`block-detail-nav-dot sticky-${b.color}`} />
                    <Link
                      to={`/author/projects/${projectId}/blocks/${b.id}`}
                      className="chapter-unassigned-title"
                    >
                      {b.title}
                    </Link>
                    <div className="chapter-unassigned-actions">
                      <button
                        className="chapter-promote-btn"
                        title="Promote to official chapter"
                        onClick={() => handlePromote(b.id, b.title)}
                      >
                        promote
                      </button>
                      <button
                        className="chapter-dissolve-btn"
                        title="Archive this note — copy any content you want to keep first"
                        onClick={() => handleArchive(b.id)}
                      >
                        archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
