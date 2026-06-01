import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SiteBanner from '../../components/SiteBanner';
import BlockDetailContent from '../../components/author/BlockDetailContent';
import { getProjection, appendEvent } from '../../api/planning';
import type { Block, Projection, Slot } from '../../types';

export default function BlockDetail() {
  const { projectId, blockId } = useParams<{ projectId: string; blockId: string }>();
  const navigate = useNavigate();

  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [navCollapsed, setNavCollapsed] = useState(() =>
    localStorage.getItem(`block-detail-nav-collapsed-${projectId}`) === 'true'
  );
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`block-detail-collapsed-${projectId}`);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set(['__board__']);
    } catch {
      return new Set(['__board__']);
    }
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    const p = await getProjection(projectId);
    setProjection(p);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

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

  function toggleSlotCollapsed(slotId: string) {
    setCollapsedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId); else next.add(slotId);
      localStorage.setItem(`block-detail-collapsed-${projectId}`, JSON.stringify([...next]));
      return next;
    });
  }

  if (loading) {
    return (
      <div className="board-page-shell">
        <SiteBanner />
        <div className="block-detail-shell">
          <p className="block-detail-loading">Loading…</p>
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
        <div className="block-detail-shell">
          <div className="content-missing">
            <i className="ti ti-note-off content-missing-icon" />
            <p className="content-missing-label">not found</p>
            <p className="content-missing-heading">Note not found.</p>
            <p className="content-missing-body">This note may have been deleted or the link is wrong.</p>
            <Link to={`/author/projects/${projectId}`} className="btn btn-secondary content-missing-cta">← back to board</Link>
          </div>
        </div>
      </div>
    );
  }

  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived');
  const outlineSlots = projection.slots.filter((s: Slot) => s.area === 'outline');

  const outlineNavBlocks = new Map<string, Block[]>(outlineSlots.map(s => [s.id, []]));
  const blocksInOutlineNav = new Set<string>();
  for (const b of activeBlocks) {
    if (outlineNavBlocks.has(b.slot)) {
      outlineNavBlocks.get(b.slot)!.push(b);
      blocksInOutlineNav.add(b.id);
    }
    for (const a of projection.outlineAssignments.filter(a => a.blockId === b.id)) {
      if (outlineNavBlocks.has(a.slotId)) {
        outlineNavBlocks.get(a.slotId)!.push(b);
        blocksInOutlineNav.add(b.id);
      }
    }
  }
  const outlineNavGroups = outlineSlots
    .map(s => ({ slot: s, blocks: outlineNavBlocks.get(s.id)! }))
    .filter(g => g.blocks.length > 0);
  const onBoardBlocks = activeBlocks.filter(b => !blocksInOutlineNav.has(b.id));

  return (
    <div className="board-page-shell">
    <SiteBanner />
    <nav className="author-breadcrumb">
      <Link to="/author" className="author-breadcrumb-link">Author Studio</Link>
      <span className="author-breadcrumb-sep">/</span>
      <Link to={`/author/projects/${projectId}`} className="author-breadcrumb-link">{projection.meta.title}</Link>
      <span className="author-breadcrumb-sep">/</span>
      <span className="author-breadcrumb-current">{block.title}</span>
      <button className="author-breadcrumb-mobile-add" title="New note" onClick={handleNewBlock}>
        <i className="ti ti-plus" />
      </button>
    </nav>
    <div className="block-detail-shell">
      <div className={`block-detail-nav${navCollapsed ? ' collapsed' : ''}`}>
        <div className="block-detail-nav-header">
          <div className="block-detail-nav-top">
            <span className="block-detail-project-name">{projection.meta.title}</span>
            <button className="block-detail-nav-add" title="Add note" onClick={handleNewBlock}>
              <i className="ti ti-plus" />
            </button>
          </div>
        </div>

        <div className="block-detail-nav-list">
          {onBoardBlocks.length > 0 && (
            <div className="block-detail-nav-group">
              <div className="block-detail-nav-group-label block-detail-nav-board-label" onClick={() => toggleSlotCollapsed('__board__')}>
                <i className={`ti ti-chevron-${collapsedSlots.has('__board__') ? 'right' : 'down'} block-detail-nav-chevron`} />
                on board
                <span className="block-detail-nav-group-count">{onBoardBlocks.length}</span>
              </div>
              {!collapsedSlots.has('__board__') && onBoardBlocks.map(b => (
                <div
                  key={b.id}
                  className={`block-detail-nav-item${b.id === blockId ? ' active' : ''}`}
                  onClick={() => navigate(`/author/projects/${projectId}/blocks/${b.id}`)}
                >
                  <span className={`block-detail-nav-dot sticky-${b.color}`} />
                  <span className="block-detail-nav-label">{b.title}</span>
                  {b.pinned && <i className="ti ti-pin block-detail-nav-pin" />}
                </div>
              ))}
            </div>
          )}

          {outlineNavGroups.map(({ slot, blocks: groupBlocks }) => {
            const isCollapsed = collapsedSlots.has(slot.id);
            return (
              <div key={slot.id} className="block-detail-nav-group">
                <div className="block-detail-nav-group-label" onClick={() => toggleSlotCollapsed(slot.id)}>
                  <i className={`ti ti-chevron-${isCollapsed ? 'right' : 'down'} block-detail-nav-chevron`} />
                  {slot.label}
                  <span className="block-detail-nav-group-count">{groupBlocks.length}</span>
                </div>
                {!isCollapsed && groupBlocks.map(b => (
                  <div
                    key={b.id}
                    className={`block-detail-nav-item${b.id === blockId ? ' active' : ''}`}
                    onClick={() => navigate(`/author/projects/${projectId}/blocks/${b.id}`)}
                  >
                    <span className={`block-detail-nav-dot sticky-${b.color}`} />
                    <span className="block-detail-nav-label">{b.title}</span>
                    {b.pinned && <i className="ti ti-pin block-detail-nav-pin" />}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="board-sidebar-toggle"
        onClick={() => setNavCollapsed(v => {
          const next = !v;
          localStorage.setItem(`block-detail-nav-collapsed-${projectId}`, String(next));
          return next;
        })}
        title={navCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        <i className={`ti ti-chevron-${navCollapsed ? 'right' : 'left'}`} />
      </button>

      <BlockDetailContent
        block={block}
        projection={projection}
        projectId={projectId!}
        onRefresh={load}
        onNewBlock={handleNewBlock}
      />
    </div>
    </div>
  );
}
