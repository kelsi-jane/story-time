import { useEffect, useRef, useState } from 'react';
import TagInput from '../TagInput';
import { appendEvent, getProjectEvents } from '../../api/planning';
import type { Block, BlockColor, BlockStatus, PersistedEvent, Projection, Slot } from '../../types';

const COLORS: BlockColor[] = ['amber', 'teal', 'coral', 'purple', 'blue'];
const COLOR_HEX: Record<BlockColor, string> = {
  amber: '#FAC775', teal: '#9FE1CB', coral: '#F5C4B3', purple: '#CECBF6', blue: '#B5D4F4',
};

const STATUS_LABELS: Record<BlockStatus, string> = {
  active: 'active', hidden: 'hidden', parked: 'parked', archived: 'archived',
};

// ── History helpers ───────────────────────────────────────────────────────────

type DiffLine = { kind: 'context' | 'add' | 'remove'; line: string };

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp;
}

function computeLineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const dp = lcs(a, b);
  const result: DiffLine[] = [];

  function walk(i: number, j: number) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      walk(i - 1, j - 1);
      result.push({ kind: 'context', line: a[i - 1] });
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      walk(i, j - 1);
      result.push({ kind: 'add', line: b[j - 1] });
    } else if (i > 0) {
      walk(i - 1, j);
      result.push({ kind: 'remove', line: a[i - 1] });
    }
  }

  walk(a.length, b.length);
  return result;
}

function compactDiff(lines: DiffLine[], contextLines = 2): DiffLine[] {
  const changed = new Set(lines.map((l, i) => l.kind !== 'context' ? i : -1).filter(i => i >= 0));
  if (changed.size === 0) return [];
  const keep = new Set<number>();
  for (const idx of changed) {
    for (let k = Math.max(0, idx - contextLines); k <= Math.min(lines.length - 1, idx + contextLines); k++) {
      keep.add(k);
    }
  }
  const compact: DiffLine[] = [];
  let lastKept = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!keep.has(i)) continue;
    if (lastKept !== -1 && i > lastKept + 1) compact.push({ kind: 'context', line: '…' });
    compact.push(lines[i]);
    lastKept = i;
  }
  return compact;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  label: string;
  prevNotes?: string;
  nextNotes?: string;
}

function buildHistory(events: PersistedEvent[], blockId: string): HistoryItem[] {
  const items: HistoryItem[] = [];
  let prevNotes = '';

  for (const ev of events) {
    const p = ev.payload as Record<string, unknown>;
    if (p.blockId !== blockId && ev.type !== 'BlockCreated') continue;

    switch (ev.type) {
      case 'BlockCreated':
        if (p.blockId !== blockId) break;
        items.push({ id: ev.id, timestamp: ev.timestamp, label: 'created' });
        break;
      case 'BlockUpdated': {
        if (p.title !== undefined)
          items.push({ id: ev.id, timestamp: ev.timestamp, label: `renamed to "${p.title}"` });
        if (p.notes !== undefined) {
          items.push({ id: ev.id, timestamp: ev.timestamp, label: 'notes updated', prevNotes, nextNotes: p.notes as string });
          prevNotes = p.notes as string;
        }
        break;
      }
      case 'BlockMoved':
        items.push({ id: ev.id, timestamp: ev.timestamp, label: `moved to ${p.toSlot}` });
        break;
      case 'BlockAssigned':
        items.push({ id: ev.id, timestamp: ev.timestamp, label: `assigned to outline: ${p.toSlot}` });
        break;
      case 'BlockUnassigned':
        items.push({ id: ev.id, timestamp: ev.timestamp, label: `removed from outline: ${p.fromSlot}` });
        break;
      case 'BlockPinned':
        items.push({ id: ev.id, timestamp: ev.timestamp, label: 'pinned' });
        break;
      case 'BlockUnpinned':
        items.push({ id: ev.id, timestamp: ev.timestamp, label: 'unpinned' });
        break;
      case 'BlockStatusChanged':
        items.push({ id: ev.id, timestamp: ev.timestamp, label: `status → ${p.status}` });
        break;
    }
  }

  return items.reverse();
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  block: Block;
  projection: Projection;
  projectId: string;
  onRefresh: () => Promise<void>;
  onNewBlock?: () => void;
}

export default function BlockDetailContent({ block, projection, projectId, onRefresh, onNewBlock }: Props) {
  const [title, setTitle] = useState(block.title);
  const [notes, setNotes] = useState(block.notes ?? '');
  const [tags, setTags] = useState(block.tags);
  const [links, setLinks] = useState(block.links ?? []);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [showBoardSlotPicker, setShowBoardSlotPicker] = useState(false);
  const savedTitle = useRef(block.title);
  const savedNotes = useRef(block.notes ?? '');
  const savedLinks = useRef(block.links ?? []);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  // Track current field values in refs so the unmount cleanup can read them
  // without stale closure values (effect with [] deps only captures initial state).
  const currentTitle = useRef(title);
  const currentNotes = useRef(notes);
  useEffect(() => { currentTitle.current = title; });
  useEffect(() => { currentNotes.current = notes; });

  // Flush unsaved title/notes when navigating away without blurring.
  useEffect(() => {
    return () => {
      const t = (currentTitle.current.trim()) || savedTitle.current;
      if (t !== savedTitle.current) {
        appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId: block.id, title: t } });
      }
      if (currentNotes.current !== savedNotes.current) {
        appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId: block.id, notes: currentNotes.current } });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const blockId = block.id;
  const boardSlots = projection.slots.filter((s: Slot) => s.area === 'board');
  const outlineSlots = projection.slots.filter((s: Slot) => s.area === 'outline');
  const pinRefSlotIds = new Set(
    projection.outlineAssignments.filter(a => a.blockId === blockId).map(a => a.slotId),
  );
  const assignedOutlineSlots = outlineSlots.filter(
    s => pinRefSlotIds.has(s.id) || s.id === block.slot,
  );
  const availableSlots = outlineSlots.filter(s => !assignedOutlineSlots.some(a => a.id === s.id));
  const currentBoardSlot = boardSlots.find(s => s.id === block.boardSlot);
  const otherBoardSlots = boardSlots.filter(s => s.id !== block.boardSlot);

  async function saveTitle() {
    const trimmed = title.trim() || savedTitle.current;
    setTitle(trimmed);
    if (trimmed === savedTitle.current) return;
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, title: trimmed } });
    savedTitle.current = trimmed;
    await onRefresh();
  }

  async function saveNotes() {
    if (notes === savedNotes.current) return;
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, notes } });
    savedNotes.current = notes;
    await onRefresh();
  }

  async function saveTags(newTags: string[]) {
    setTags(newTags);
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, tags: newTags } });
  }

  async function saveLinks(next: string[]) {
    const clean = next.filter(l => l.trim());
    if (JSON.stringify(clean) === JSON.stringify(savedLinks.current)) return;
    savedLinks.current = clean;
    setLinks(clean);
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, links: clean } });
  }

  async function changeColor(color: BlockColor) {
    await appendEvent(projectId, { type: 'BlockUpdated', payload: { blockId, color } });
    await onRefresh();
  }

  async function changeStatus(status: BlockStatus) {
    await appendEvent(projectId, { type: 'BlockStatusChanged', payload: { blockId, status } });
    await onRefresh();
  }

  async function togglePin() {
    await appendEvent(projectId, {
      type: block.pinned ? 'BlockUnpinned' : 'BlockPinned',
      payload: { blockId },
    });
    await onRefresh();
  }

  async function assignToSlot(slotId: string) {
    setShowSlotPicker(false);
    await appendEvent(projectId, {
      type: 'BlockAssigned',
      payload: { blockId, fromSlot: block.slot, toSlot: slotId, referenced: block.pinned },
    });
    await onRefresh();
  }

  async function unassignFromSlot(slotId: string) {
    await appendEvent(projectId, {
      type: 'BlockUnassigned',
      payload: { blockId, fromSlot: slotId, toSlot: 'unplaced' },
    });
    await onRefresh();
  }

  async function moveToBoardSlot(slotId: string) {
    setShowBoardSlotPicker(false);
    await appendEvent(projectId, {
      type: 'BlockMoved',
      payload: { blockId, fromSlot: block.boardSlot, toSlot: slotId },
    });
    await onRefresh();
  }

  async function toggleHistory() {
    if (!historyOpen && historyItems === null) {
      setHistoryLoading(true);
      try {
        const all = await getProjectEvents(projectId);
        setHistoryItems(buildHistory(all, blockId));
      } finally {
        setHistoryLoading(false);
      }
    }
    setHistoryOpen(v => !v);
  }

  function toggleDiff(id: string) {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
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
              title={block.pinned ? 'Unpin' : 'Pin — keep on board when assigned to outline'}
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
            {onNewBlock && (
              <button className="block-detail-new-btn" onClick={onNewBlock} title="New note">
                <i className="ti ti-plus" />
              </button>
            )}
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

          <div className="block-detail-section">
            <button className="block-detail-history-toggle" onClick={toggleHistory}>
              <i className={`ti ti-chevron-${historyOpen ? 'down' : 'right'} block-detail-history-chevron`} />
              history
              {historyLoading && <span className="block-detail-history-loading"> loading…</span>}
            </button>

            {historyOpen && historyItems !== null && (
              <div className="block-detail-history-list">
                {historyItems.length === 0 ? (
                  <span className="block-detail-history-empty">no history yet</span>
                ) : historyItems.map(item => {
                  const hasDiff = item.prevNotes !== undefined && item.nextNotes !== undefined;
                  const isExpanded = expandedDiffs.has(item.id);
                  const diffLines = hasDiff && isExpanded
                    ? compactDiff(computeLineDiff(item.prevNotes!, item.nextNotes!))
                    : null;

                  const rowContent = (
                    <>
                      <span className="block-detail-history-date">
                        {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(item.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="block-detail-history-label">{item.label}</span>
                      {hasDiff && (
                        <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'} block-detail-history-chevron-inline`} />
                      )}
                    </>
                  );

                  return (
                    <div key={item.id} className="block-detail-history-item">
                      {hasDiff ? (
                        <button
                          className="block-detail-history-row block-detail-history-row-btn"
                          onClick={() => toggleDiff(item.id)}
                          title={isExpanded ? 'Hide diff' : 'Show diff'}
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div className="block-detail-history-row">{rowContent}</div>
                      )}
                      {diffLines && diffLines.length > 0 && (
                        <div className="block-detail-history-diff">
                          {diffLines.map((line, i) => (
                            <div key={i} className={`block-detail-history-diff-${line.kind}`}>
                              {line.kind === 'add' ? '+ ' : line.kind === 'remove' ? '− ' : '  '}
                              {line.line || ' '}
                            </div>
                          ))}
                        </div>
                      )}
                      {diffLines && diffLines.length === 0 && isExpanded && (
                        <div className="block-detail-history-diff">
                          <div className="block-detail-history-diff-context">  (no textual change)</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
