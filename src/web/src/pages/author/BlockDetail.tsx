import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SiteBanner from '../../components/SiteBanner';
import ProjectSidebar from '../../components/author/ProjectSidebar';
import BlockDetailContent from '../../components/author/BlockDetailContent';
import ChapterDetail from '../../components/author/ChapterDetail';
import { getProjection, appendEvent } from '../../api/planning';
import type { Block, Projection, Slot } from '../../types';

function PromoteNudge({ block, projectId, onRefresh }: {
  block: Block; projectId: string; onRefresh: () => Promise<void>;
}) {
  const key = `promote-nudge-${block.id}-dismissed`;
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(key) === '1');

  async function handlePromote() {
    const chapterId = `ch_${Math.random().toString(36).slice(2, 12)}`;
    await appendEvent(projectId, {
      type: 'ChapterPromoted',
      payload: { chapterId, title: block.title, boardBlockId: block.id },
    });
    await onRefresh();
  }

  if (dismissed) return null;

  return (
    <div className="chapter-promote-nudge">
      <span className="chapter-promote-nudge-text">
        This note is in your chapters zone. Promote it to an official chapter to unlock the full writing suite — content editor, preview, and story view split-pane.
      </span>
      <div className="chapter-promote-nudge-actions">
        <button className="chapter-promote-nudge-btn" onClick={handlePromote}>
          Promote to Chapter
        </button>
        <button className="chapter-promote-nudge-dismiss" onClick={() => {
          sessionStorage.setItem(key, '1');
          setDismissed(true);
        }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function BlockDetail() {
  const { projectId, blockId } = useParams<{ projectId: string; blockId: string }>();
  const navigate = useNavigate();

  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem(`sidebar-collapsed-${projectId}`) === 'true'
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    const p = await getProjection(projectId);
    setProjection(p);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const initialBlockId = useRef(blockId);
  useEffect(() => {
    if (blockId === initialBlockId.current) return;
    load();
  }, [blockId, load]);

  useEffect(() => { setSwitcherOpen(false); }, [blockId]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node))
        setSwitcherOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleNewBlock() {
    if (!projectId) return;
    const newBlockId = `blk_${Math.random().toString(36).slice(2, 12)}`;
    await appendEvent(projectId, {
      type: 'BlockCreated',
      payload: { blockId: newBlockId, title: 'New note', color: 'amber', slot: 'unplaced' },
    });
    navigate(`/author/projects/${projectId}/blocks/${newBlockId}`);
  }

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(`sidebar-collapsed-${projectId}`, String(next));
      return next;
    });
  }

  if (loading) {
    return (
      <div className="board-page-shell">
        <SiteBanner />
        <div className="board-app">
          <p style={{ padding: 24, fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!projection) return null;

  const block = projection.blocks.find(b => b.id === blockId);
  if (!block) {
    return (
      <div className="board-page-shell">
        <SiteBanner />
        <div className="board-app">
          <div className="board-main">
            <div className="content-missing">
              <i className="ti ti-note-off content-missing-icon" />
              <p className="content-missing-label">not found</p>
              <p className="content-missing-heading">Note not found.</p>
              <p className="content-missing-body">This note may have been deleted or the link is wrong.</p>
              <Link to={`/author/projects/${projectId}`} className="btn btn-secondary content-missing-cta">← back to board</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const promotedChapter = projection.chapters.find(ch => ch.boardBlockId === block.id) ?? null;
  const isChapterZoneNote = block.boardSlot === 'chapters' && !promotedChapter;

  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived');

  const boardSlots = projection.slots.filter((s: Slot) => s.area === 'board');
  const switcherGroups = boardSlots
    .map(slot => ({
      slot,
      blocks: activeBlocks.filter(b => b.boardSlot === slot.id),
    }))
    .filter(g => g.blocks.length > 0);

  return (
    <div className="board-page-shell">
      <SiteBanner />
      <div className="board-app">
        <ProjectSidebar
          meta={projection.meta}
          blockCount={activeBlocks.length}
          collapsed={sidebarCollapsed}
        />
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
              <Link to={`/author/projects/${projectId}`} className="author-breadcrumb-link">
                {projection.meta.title}
              </Link>
              <span className="author-breadcrumb-sep">/</span>

              <div className="block-detail-switcher-wrap" ref={switcherRef}>
                <button
                  className="author-breadcrumb-current block-detail-switcher-btn"
                  onClick={() => setSwitcherOpen(v => !v)}
                >
                  {block.title}
                  <i className="ti ti-chevron-down block-detail-switcher-chevron" />
                </button>

                {switcherOpen && (
                  <div className="block-detail-slot-picker block-detail-switcher-picker">
                    {switcherGroups.map(({ slot, blocks }) => (
                      <React.Fragment key={slot.id}>
                        <div className="block-detail-nav-group-label pane-picker-group">
                          {slot.label}
                          <span className="block-detail-nav-group-count">{blocks.length}</span>
                        </div>
                        {blocks.map(b => (
                          <button
                            key={b.id}
                            className={`block-detail-slot-option${b.id === blockId ? ' selected' : ''}`}
                            onClick={() => navigate(`/author/projects/${projectId}/blocks/${b.id}`)}
                          >
                            <span className={`block-detail-nav-dot sticky-${b.color}`} />
                            {b.title}
                            {b.pinned && <i className="ti ti-pin block-detail-nav-pin" />}
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                    {switcherGroups.length === 0 && (
                      <p className="story-notes-empty">No notes yet.</p>
                    )}
                  </div>
                )}
              </div>
            </nav>
            <div className="board-toolbar-divider" />
            <button className="board-toolbar-btn" onClick={handleNewBlock} title="New note">
              <i className="ti ti-plus" /> new note
            </button>
          </div>

          {promotedChapter ? (
            <ChapterDetail
              key={promotedChapter.id}
              block={block}
              chapter={promotedChapter}
              projection={projection}
              projectId={projectId!}
              onRefresh={load}
              onNewBlock={handleNewBlock}
            />
          ) : (
            <div className="chapter-detail-shell">
              {isChapterZoneNote && (
                <PromoteNudge
                  block={block}
                  projectId={projectId!}
                  onRefresh={load}
                />
              )}
              <BlockDetailContent
                key={block.id}
                block={block}
                projection={projection}
                projectId={projectId!}
                onRefresh={load}
                onNewBlock={handleNewBlock}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
