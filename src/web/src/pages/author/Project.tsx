import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthorLayout from '../../components/AuthorLayout';
import ProjectSidebar from '../../components/author/ProjectSidebar';
import Board from '../../components/author/Board';
import OutlinePanel from '../../components/author/OutlinePanel';
import { getProjection, appendEvent } from '../../api/planning';
import type { Block, BlockColor, Projection } from '../../types';

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return (
      <AuthorLayout>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{error || 'Project not found.'}</p>
      </AuthorLayout>
    );
  }

  const activeBlocks = projection.blocks.filter((b: Block) => b.status !== 'archived');
  const boardBlocks = activeBlocks.filter((b: Block) => {
    const slot = projection.slots.find(s => s.id === b.slot);
    return slot?.area === 'board' || !slot;
  });

  return (
    <div className="board-app">
      <ProjectSidebar meta={projection.meta} blockCount={activeBlocks.length} />

      <div className="board-main">
        <div className="board-toolbar">
          <span className="board-toolbar-title">brainstorm board</span>
          <button className="board-toolbar-btn" disabled>
            <i className="ti ti-filter" /> filter
          </button>
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
          onBlockCreated={handleBlockCreated}
        />
      </div>

      <OutlinePanel slots={projection.slots} blocks={projection.blocks} />
    </div>
  );
}
