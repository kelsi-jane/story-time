import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SiteBanner from '../../components/SiteBanner';
import ProjectSidebar from '../../components/author/ProjectSidebar';
import { getProjection } from '../../api/planning';
import type { Projection, Slot } from '../../types';

export default function Notes() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem(`sidebar-collapsed-${projectId}`) === 'true'
  );

  const load = useCallback(async () => {
    if (!projectId) return;
    const p = await getProjection(projectId);
    setProjection(p);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

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

  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived');
  const boardSlots = projection.slots.filter((s: Slot) => s.area === 'board');
  const groups = boardSlots
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
              <span className="author-breadcrumb-current">notes</span>
            </nav>
          </div>

          <div className="notes-page-body">
            {groups.length === 0 ? (
              <p className="story-notes-empty">No notes yet.</p>
            ) : groups.map(({ slot, blocks }) => (
              <div key={slot.id} className="block-detail-nav-group notes-page-group">
                <div className="block-detail-nav-group-label notes-page-group-label">
                  {slot.label}
                  <span className="block-detail-nav-group-count">{blocks.length}</span>
                </div>
                {blocks.map(b => (
                  <div
                    key={b.id}
                    className="block-detail-nav-item notes-page-item"
                    onClick={() => navigate(`/author/projects/${projectId}/blocks/${b.id}`)}
                  >
                    <span className={`block-detail-nav-dot sticky-${b.color}`} />
                    <span className="block-detail-nav-label">{b.title}</span>
                    {b.pinned && <i className="ti ti-pin block-detail-nav-pin" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
