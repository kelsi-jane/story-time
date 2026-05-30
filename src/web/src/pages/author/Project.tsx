import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthorLayout from '../../components/AuthorLayout';
import SiteBanner from '../../components/SiteBanner';
import ProjectSidebar from '../../components/author/ProjectSidebar';
import Board from '../../components/author/Board';
import OutlinePanel from '../../components/author/OutlinePanel';
import { getProjection, appendEvent } from '../../api/planning';
import type { Block, BlockColor, Projection } from '../../types';

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(() =>
    localStorage.getItem(`show-archived-${projectId}`) === 'true'
  );
  const [boardLayout, setBoardLayout] = useState<'columns' | 'rows'>(() =>
    (localStorage.getItem(`board-layout-${projectId}`) as 'columns' | 'rows') ?? 'columns'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem(`sidebar-collapsed-${projectId}`) === 'true'
  );
  const [outlineWidth, setOutlineWidth] = useState(() => {
    const stored = localStorage.getItem(`outline-width-${projectId}`);
    return stored ? parseInt(stored, 10) : 240;
  });
  const outlineWidthRef = useRef(outlineWidth);

  function setBoardLayoutPersisted(layout: 'columns' | 'rows') {
    setBoardLayout(layout);
    localStorage.setItem(`board-layout-${projectId}`, layout);
  }

  function toggleShowArchived() {
    setShowArchived(prev => {
      const next = !prev;
      localStorage.setItem(`show-archived-${projectId}`, String(next));
      return next;
    });
  }

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(`sidebar-collapsed-${projectId}`, String(next));
      return next;
    });
  }

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = outlineWidthRef.current;

    function onMouseMove(e: MouseEvent) {
      const newWidth = Math.max(160, Math.min(520, startWidth + (startX - e.clientX)));
      outlineWidthRef.current = newWidth;
      setOutlineWidth(newWidth);
    }

    function onMouseUp() {
      localStorage.setItem(`outline-width-${projectId}`, String(outlineWidthRef.current));
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  const loadProjection = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await getProjection(projectId);
      setProjection(p);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadProjection(); }, [loadProjection]);

  async function handleBlockCreated(slotId: string, title: string, color: BlockColor) {
    if (!projectId || !user) return;
    const blockId = `blk_${Math.random().toString(36).slice(2, 12)}`;
    await appendEvent(projectId, {
      type: 'BlockCreated',
      payload: { blockId, title, color, slot: slotId },
    });
    navigate(`/author/projects/${projectId}/blocks/${blockId}`);
  }

  async function handleBlockMoved(blockId: string, fromSlot: string, toSlot: string) {
    if (!projectId) return;
    await appendEvent(projectId, {
      type: 'BlockMoved',
      payload: { blockId, fromSlot, toSlot },
    });
    await loadProjection();
  }

  async function handleBlockAssigned(blockId: string, fromSlot: string, toSlot: string) {
    if (!projectId) return;
    const block = projection?.blocks.find(b => b.id === blockId);
    await appendEvent(projectId, {
      type: 'BlockAssigned',
      payload: { blockId, fromSlot, toSlot, referenced: block?.pinned ?? false },
    });
    await loadProjection();
  }

  async function handleBlockUnassigned(blockId: string, fromSlot: string) {
    if (!projectId) return;
    await appendEvent(projectId, {
      type: 'BlockUnassigned',
      payload: { blockId, fromSlot, toSlot: '' },
    });
    await loadProjection();
  }

  async function handleSlotReordered(slotId: string, newOrder: number) {
    if (!projectId) return;
    await appendEvent(projectId, {
      type: 'SlotReordered',
      payload: { slotId, order: newOrder },
    });
    await loadProjection();
  }

  async function handleBlockPinToggled(blockId: string) {
    if (!projectId) return;
    const block = projection?.blocks.find(b => b.id === blockId);
    if (!block) return;
    await appendEvent(projectId, {
      type: block.pinned ? 'BlockUnpinned' : 'BlockPinned',
      payload: { blockId },
    });
    await loadProjection();
  }

  if (loading) {
    return (
      <AuthorLayout>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading…</p>
      </AuthorLayout>
    );
  }

  if (error || !projection) {
    const isNotFound = !projection && !error;
    return (
      <AuthorLayout>
        <div className="content-missing">
          <i className={`ti ${isNotFound ? 'ti-folder-off' : 'ti-alert-triangle'} content-missing-icon`} />
          <p className="content-missing-label">{isNotFound ? 'not found' : 'something went wrong'}</p>
          <p className="content-missing-heading">{isNotFound ? 'Project not found.' : "This project wouldn't load."}</p>
          <p className="content-missing-body">
            {error || "We couldn't find this project. It may have been moved or deleted."}
          </p>
          <Link to="/author" className="btn btn-secondary content-missing-cta">← back to projects</Link>
        </div>
      </AuthorLayout>
    );
  }

  const activeBlocks = projection.blocks.filter((b: Block) => b.status !== 'archived');
  const boardBlocks = projection.blocks.filter((b: Block) => {
    const slot = projection.slots.find(s => s.id === b.slot);
    return slot?.area === 'board' || !slot;
  });

  return (
    <div className="board-page-shell">
    <SiteBanner />
    <div className="board-app">
      <ProjectSidebar meta={projection.meta} blockCount={activeBlocks.length} collapsed={sidebarCollapsed} />
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
            <Link to="/author" className="author-breadcrumb-link">author</Link>
            <span className="author-breadcrumb-sep">/</span>
            <span className="author-breadcrumb-current">{projection.meta.title}</span>
          </nav>
          <div className="board-toolbar-divider" />
          <button className="board-toolbar-btn" disabled>
            <i className="ti ti-filter" /> filter
          </button>
          <div className="board-toolbar-divider" />
          <button
            className={`board-toolbar-btn${showArchived ? ' active' : ''}`}
            onClick={toggleShowArchived}
            title={showArchived ? 'Hide archived notes' : 'Show archived notes'}
          >
            <i className="ti ti-archive" /> archived
          </button>
          <div className="board-toolbar-divider" />
          <div className="board-layout-toggle">
            <button
              className={`board-layout-btn${boardLayout === 'columns' ? ' active' : ''}`}
              onClick={() => setBoardLayoutPersisted('columns')}
              title="Column layout"
            >
              <i className="ti ti-layout-columns" />
            </button>
            <button
              className={`board-layout-btn${boardLayout === 'rows' ? ' active' : ''}`}
              onClick={() => setBoardLayoutPersisted('rows')}
              title="Row layout"
            >
              <i className="ti ti-layout-rows" />
            </button>
          </div>
          <div className="board-toolbar-divider" />
          <button className="board-toolbar-btn" disabled>
            <i className="ti ti-link" /> link
          </button>
          <div className="board-toolbar-divider" />
          <button className="board-toolbar-btn" disabled>
            <i className="ti ti-camera" /> snapshot
          </button>
        </div>
        <Board
          slots={projection.slots}
          blocks={boardBlocks}
          showArchived={showArchived}
          layout={boardLayout}
          onBlockCreated={handleBlockCreated}
          onBlockMoved={handleBlockMoved}
          onBlockClick={(blockId) => navigate(`/author/projects/${projectId}/blocks/${blockId}`)}
          onBlockPinToggled={handleBlockPinToggled}
          onSlotReordered={handleSlotReordered}
        />
      </div>

      <div className="board-resize-handle" onMouseDown={handleResizeStart} />
      <div className="board-outline-wrapper" style={{ width: outlineWidth, minWidth: outlineWidth }}>
        <OutlinePanel
          slots={projection.slots}
          blocks={projection.blocks}
          outlineAssignments={projection.outlineAssignments}
          onBlockAssigned={handleBlockAssigned}
          onBlockUnassigned={handleBlockUnassigned}
          onBlockClick={(blockId) => navigate(`/author/projects/${projectId}/blocks/${blockId}`)}
        />
      </div>
    </div>
    </div>
  );
}
