import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TagInput from '../../components/TagInput';
import { getProjection, appendEvent } from '../../api/planning';
import type { Block, BlockStatus, Projection, Slot } from '../../types';

export default function BlockDetail() {
  const { projectId, blockId } = useParams<{ projectId: string; blockId: string }>();
  const navigate = useNavigate();

  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  const savedTitle = useRef('');
  const savedNotes = useRef('');

  const load = useCallback(async () => {
    if (!projectId) return;
    const p = await getProjection(projectId);
    setProjection(p);
    const b = p.blocks.find(b => b.id === blockId);
    if (b) {
      setTitle(b.title);
      setNotes(b.notes ?? '');
      setTags(b.tags);
      savedTitle.current = b.title;
      savedNotes.current = b.notes ?? '';
    }
    setLoading(false);
  }, [projectId, blockId]);

  useEffect(() => { load(); }, [load]);

  async function saveTitle() {
    if (!projectId || !blockId || title.trim() === savedTitle.current) return;
    const trimmed = title.trim() || savedTitle.current;
    setTitle(trimmed);
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, title: trimmed } });
    savedTitle.current = trimmed;
  }

  async function saveNotes() {
    if (!projectId || !blockId || notes === savedNotes.current) return;
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, notes } });
    savedNotes.current = notes;
  }

  async function saveTags(newTags: string[]) {
    setTags(newTags);
    if (!projectId || !blockId) return;
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, tags: newTags } });
  }

  async function changeStatus(status: BlockStatus) {
    if (!projectId || !blockId) return;
    await appendEvent(projectId, { type: 'BlockStatusChanged', payload: { blockId, status } });
    await load();
  }

  async function assignToSlot(slotId: string) {
    if (!projectId || !blockId || !projection) return;
    const block = projection.blocks.find(b => b.id === blockId);
    if (!block) return;
    setShowSlotPicker(false);
    await appendEvent(projectId, { type: 'BlockAssigned', payload: { blockId, fromSlot: block.slot, toSlot: slotId } });
    await load();
  }

  async function unassign() {
    if (!projectId || !blockId || !projection) return;
    const block = projection.blocks.find(b => b.id === blockId);
    if (!block) return;
    await appendEvent(projectId, { type: 'BlockUnassigned', payload: { blockId, fromSlot: block.slot, toSlot: 'unplaced' } });
    await load();
  }

  if (loading) {
    return (
      <div className="block-detail-shell">
        <p className="block-detail-loading">Loading…</p>
      </div>
    );
  }

  if (!projection) return null;

  const block = projection.blocks.find(b => b.id === blockId);
  if (!block) {
    return (
      <div className="block-detail-shell">
        <p className="block-detail-loading">Block not found.</p>
      </div>
    );
  }

  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived');
  const outlineSlots = projection.slots.filter((s: Slot) => s.area === 'outline');
  const assignedSlot = outlineSlots.find((s: Slot) => s.id === block.slot);

  const STATUS_LABELS: Record<BlockStatus, string> = {
    active: 'active',
    hidden: 'hidden',
    parked: 'parked',
    archived: 'archived',
  };

  return (
    <div className="block-detail-shell">
      <div className="block-detail-nav">
        <div className="block-detail-nav-header">
          <Link to={`/author/projects/${projectId}`} className="block-detail-back">
            <i className="ti ti-arrow-left" /> board
          </Link>
          <span className="block-detail-project-name">{projection.meta.title}</span>
        </div>
        <div className="block-detail-nav-list">
          {activeBlocks.map(b => (
            <div
              key={b.id}
              className={`block-detail-nav-item${b.id === blockId ? ' active' : ''}`}
              onClick={() => navigate(`/author/projects/${projectId}/blocks/${b.id}`)}
            >
              <span className={`block-detail-nav-dot sticky-${b.color}`} />
              <span className="block-detail-nav-label">{b.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="block-detail-main">
        <div className={`block-detail-header sticky-${block.color}`}>
          <input
            className="block-detail-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="Block title"
          />
          <div className="block-detail-header-actions">
            {assignedSlot ? (
              <span className="block-detail-assigned-chip">
                <i className="ti ti-list" /> {assignedSlot.label}
                <button className="block-detail-unassign" onClick={unassign} title="Remove from outline">×</button>
              </span>
            ) : (
              <div className="block-detail-assign-wrap">
                <button
                  className="board-toolbar-btn"
                  onClick={() => setShowSlotPicker(v => !v)}
                  disabled={outlineSlots.length === 0}
                >
                  <i className="ti ti-list" /> assign to outline
                </button>
                {showSlotPicker && (
                  <div className="block-detail-slot-picker">
                    {outlineSlots.map((s: Slot) => (
                      <button key={s.id} className="block-detail-slot-option" onClick={() => assignToSlot(s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button className="board-toolbar-btn" disabled title="Coming soon — copy a block to a story draft">
              <i className="ti ti-copy" /> copy to story
            </button>
          </div>
        </div>

        <div className="block-detail-body">
          <div className="block-detail-section">
            <label className="block-detail-label">notes</label>
            <textarea
              className="block-detail-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes, context, or ideas…"
              rows={8}
            />
          </div>

          <div className="block-detail-section">
            <label className="block-detail-label">tags</label>
            <TagInput value={tags} onChange={saveTags} />
          </div>

          <div className="block-detail-section">
            <label className="block-detail-label">status</label>
            <div className="block-detail-status-row">
              {(['active', 'hidden', 'parked', 'archived'] as BlockStatus[]).map(s => (
                <button
                  key={s}
                  className={`block-detail-status-btn${s === 'archived' ? ' danger' : ''}${block.status === s ? ' active' : ''}`}
                  onClick={() => changeStatus(s)}
                  disabled={block.status === s}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="block-detail-meta">
            <span>created {new Date(block.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span>updated {new Date(block.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
