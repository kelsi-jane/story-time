import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TagInput from '../../components/TagInput';
import SiteBanner from '../../components/SiteBanner';
import { getProjection, appendEvent } from '../../api/planning';
import type { Block, BlockColor, BlockStatus, Projection, Slot } from '../../types';

const COLORS: BlockColor[] = ['amber', 'teal', 'coral', 'purple', 'blue'];
const COLOR_HEX: Record<BlockColor, string> = {
  amber: '#FAC775', teal: '#9FE1CB', coral: '#F5C4B3', purple: '#CECBF6', blue: '#B5D4F4',
};


export default function BlockDetail() {
  const { projectId, blockId } = useParams<{ projectId: string; blockId: string }>();
  const navigate = useNavigate();

  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [showBoardSlotPicker, setShowBoardSlotPicker] = useState(false);
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

  const savedTitle = useRef('');
  const savedNotes = useRef('');
  const savedLinks = useRef<string[]>([]);

  const load = useCallback(async () => {
    if (!projectId) return;
    const p = await getProjection(projectId);
    setProjection(p);
    const b = p.blocks.find(b => b.id === blockId);
    if (b) {
      setTitle(b.title);
      setNotes(b.notes ?? '');
      setTags(b.tags);
      setLinks(b.links ?? []);
      savedTitle.current = b.title;
      savedNotes.current = b.notes ?? '';
      savedLinks.current = b.links ?? [];
    }
    setLoading(false);
  }, [projectId, blockId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  async function saveLinks(next: string[]) {
    if (!projectId || !blockId) return;
    const clean = next.filter(l => l.trim());
    if (JSON.stringify(clean) === JSON.stringify(savedLinks.current)) return;
    savedLinks.current = clean;
    setLinks(clean);
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, links: clean } });
  }

  async function changeColor(color: BlockColor) {
    if (!projectId || !blockId) return;

    setProjection(p => p && {
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? { ...b, color } : b),
    });

    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, color } });
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
    await appendEvent(projectId, {
      type: 'BlockAssigned',
      payload: { blockId, fromSlot: block.slot, toSlot: slotId, referenced: block.pinned },
    });
    await load();
  }

  async function unassignFromSlot(slotId: string) {
    if (!projectId || !blockId || !projection) return;
    const block = projection.blocks.find(b => b.id === blockId);
    if (!block) return;
    await appendEvent(projectId, { type: 'BlockUnassigned', payload: { blockId, fromSlot: slotId, toSlot: 'unplaced' } });
    await load();
  }

  async function togglePin() {
    if (!projectId || !blockId || !projection) return;
    const b = projection.blocks.find(b => b.id === blockId);
    if (!b) return;
    await appendEvent(projectId, {
      type: b.pinned ? 'BlockUnpinned' : 'BlockPinned',
      payload: { blockId },
    });
    await load();
  }

  async function moveToBoardSlot(slotId: string) {
    if (!projectId || !blockId || !projection) return;
    const block = projection.blocks.find(b => b.id === blockId);
    if (!block) return;
    setShowBoardSlotPicker(false);
    await appendEvent(projectId, {
      type: 'BlockMoved',
      payload: { blockId, fromSlot: block.boardSlot, toSlot: slotId },
    });
    await load();
  }

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
  const boardSlots = projection.slots.filter((s: Slot) => s.area === 'board');
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
  const pinRefSlotIds = new Set(
    projection.outlineAssignments.filter(a => a.blockId === blockId).map(a => a.slotId),
  );
  const assignedOutlineSlots = outlineSlots.filter(
    s => pinRefSlotIds.has(s.id) || s.id === block.slot,
  );
  const availableSlots = outlineSlots.filter(s => !assignedOutlineSlots.some(a => a.id === s.id));

  const currentBoardSlot = boardSlots.find(s => s.id === block.boardSlot);
  const otherBoardSlots = boardSlots.filter(s => s.id !== block.boardSlot);

  const STATUS_LABELS: Record<BlockStatus, string> = {
    active: 'active',
    hidden: 'hidden',
    parked: 'parked',
    archived: 'archived',
  };

  return (
    <div className="board-page-shell">
    <SiteBanner />
    <nav className="author-breadcrumb">
      <Link to="/author" className="author-breadcrumb-link">author</Link>
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
            <button
              className="block-detail-nav-add"
              title="Add note"
              onClick={handleNewBlock}
            >
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

      <div className="block-detail-main">
        <div className="block-detail-header">
          <div className={`block-detail-content-col sticky-${block.color}`}>
          <input
            className="block-detail-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder="Note title"
          />
          <div className="block-detail-header-actions">
            <button
              className={`block-detail-pin-btn${block.pinned ? ' pinned' : ''}`}
              onClick={togglePin}
              title={block.pinned ? 'Unpin — remove from board when assigned to outline' : 'Pin — keep on board when assigned to outline'}
            >
              <i className="ti ti-pin" />
            </button>

            <div className="block-detail-color-picker">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`block-detail-color-dot${block.color === c ? ' active' : ''}`}
                  style={{ background: COLOR_HEX[c] }}
                  title={c}
                  onClick={() => changeColor(c)}
                />
              ))}
            </div>

            <button className="block-detail-new-btn" onClick={handleNewBlock} title="New note">
              <i className="ti ti-plus" />
            </button>
          </div>
          </div>
        </div>

        <div className="block-detail-body">
          <div className={`block-detail-content-col sticky-${block.color}-tint`}>

          <div className="block-detail-pickers">
            <div className="block-detail-assign-wrap">
              <button className="board-toolbar-btn" onClick={() => setShowBoardSlotPicker(v => !v)}>
                {currentBoardSlot?.label ?? 'unplaced'}
              </button>
              {showBoardSlotPicker && otherBoardSlots.length > 0 && (
                <div className="block-detail-slot-picker">
                  {otherBoardSlots.map((s: Slot) => (
                    <button key={s.id} className="block-detail-slot-option" onClick={() => moveToBoardSlot(s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {availableSlots.length > 0 && (
              <div className="block-detail-assign-wrap">
                <button className="board-toolbar-btn" onClick={() => setShowSlotPicker(v => !v)}>
                  <i className="ti ti-list" /> assign to outline
                </button>
                {showSlotPicker && (
                  <div className="block-detail-slot-picker">
                    {availableSlots.map((s: Slot) => (
                      <button key={s.id} className="block-detail-slot-option" onClick={() => assignToSlot(s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {assignedOutlineSlots.length > 0 && (
              <div className="block-detail-chips-group">
                {assignedOutlineSlots.map(s => (
                  <span key={s.id} className={`block-detail-assigned-chip${pinRefSlotIds.has(s.id) ? ' pinned-ref' : ''}`}>
                    <i className={`ti ${pinRefSlotIds.has(s.id) ? 'ti-pin' : 'ti-list'}`} /> {s.label}
                    <button className="block-detail-unassign" onClick={() => unassignFromSlot(s.id)} title="Remove from outline">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
            <label className="block-detail-label">research links</label>
            {[...links, ''].map((url, i) => (
              <div key={i} className="block-detail-links-row">
                <input
                  className="block-detail-links-input"
                  value={url}
                  placeholder="https://…"
                  onChange={e => {
                    const next = [...links];
                    next[i] = e.target.value;
                    setLinks(next);
                  }}
                  onBlur={() => saveLinks([...links])}
                />
                {url.trim() && (
                  <button
                    className="block-detail-links-open"
                    title="Open in new tab"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                  >
                    <i className="ti ti-external-link" />
                  </button>
                )}
              </div>
            ))}
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
    </div>
    </div>
  );
}
