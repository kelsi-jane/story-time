import { useState } from 'react';
import type { Block, BlockColor, Slot } from '../../types';
import StickyNote from './StickyNote';

interface Zone {
  slotId: string;
  icon: string;
  wide?: boolean;
}

const ZONE_ROWS: Zone[][] = [
  [
    { slotId: 'loose-ideas',  icon: 'ti-bulb', wide: true },
    { slotId: 'characters',   icon: 'ti-users' },
  ],
  [
    { slotId: 'scenes-beats', icon: 'ti-clock' },
    { slotId: 'parking-lot',  icon: 'ti-car-garage' },
    { slotId: 'unplaced',     icon: 'ti-circle-dashed' },
  ],
];

const COLORS: BlockColor[] = ['amber', 'teal', 'coral', 'purple', 'blue'];
const COLOR_HEX: Record<BlockColor, string> = {
  amber:  '#FAC775',
  teal:   '#9FE1CB',
  coral:  '#F5C4B3',
  purple: '#CECBF6',
  blue:   '#B5D4F4',
};

interface Props {
  slots: Slot[];
  blocks: Block[];
  onBlockCreated: (slotId: string, title: string, color: BlockColor) => void;
  onBlockMoved: (blockId: string, fromSlot: string, toSlot: string) => void;
  onBlockClick: (blockId: string) => void;
}

interface CreateState {
  slotId: string;
  title: string;
  color: BlockColor;
}

export default function Board({ slots, blocks, onBlockCreated, onBlockMoved, onBlockClick }: Props) {
  const [creating, setCreating] = useState<CreateState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  function startCreate(slotId: string) {
    setCreating({ slotId, title: '', color: 'amber' });
  }

  function confirmCreate() {
    if (!creating || !creating.title.trim()) { setCreating(null); return; }
    onBlockCreated(creating.slotId, creating.title.trim(), creating.color);
    setCreating(null);
  }

  function handleDrop(e: React.DragEvent, toSlotId: string) {
    e.preventDefault();
    setDragOverSlot(null);
    const blockId = e.dataTransfer.getData('text/plain');
    if (!blockId) return;
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.slot === toSlotId) return;
    onBlockMoved(blockId, block.slot, toSlotId);
    setDraggingId(null);
  }

  function slotForId(id: string): Slot | undefined {
    return slots.find(s => s.id === id);
  }

  return (
    <div className="board-canvas" onDragEnd={() => { setDraggingId(null); setDragOverSlot(null); }}>
      {ZONE_ROWS.map((row, ri) => (
        <div key={ri} className="board-zone-row">
          {row.map(zone => {
            const slot = slotForId(zone.slotId);
            if (!slot) return null;
            const zoneBlocks = blocks.filter(b => b.slot === zone.slotId && b.status === 'active');
            const isCreating = creating?.slotId === zone.slotId;
            const isDragOver = dragOverSlot === zone.slotId;

            return (
              <div
                key={zone.slotId}
                className={`board-zone${zone.wide ? ' wide' : ''}${isDragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverSlot(zone.slotId); }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverSlot(null);
                  }
                }}
                onDrop={e => handleDrop(e, zone.slotId)}
              >
                <div className="board-zone-header">
                  <i className={`ti ${zone.icon}`} />
                  <span className="board-zone-label">{slot.label}</span>
                  <span className="board-zone-count">{zoneBlocks.length}</span>
                  <button className="board-zone-add" onClick={() => startCreate(zone.slotId)} title="Add block">
                    <i className="ti ti-plus" />
                  </button>
                </div>

                <div className="board-zone-cards">
                  {zoneBlocks.map(b => (
                    <StickyNote
                      key={b.id}
                      block={b}
                      onDragStart={setDraggingId}
                      onClick={onBlockClick}
                    />
                  ))}
                </div>

                {isCreating && (
                  <div className="board-zone-create">
                    <input
                      type="text"
                      placeholder="Block title…"
                      value={creating.title}
                      onChange={e => setCreating(c => c && ({ ...c, title: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') setCreating(null); }}
                      autoFocus
                    />
                    <div className="board-zone-create-colors">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`board-zone-create-color${creating.color === c ? ' selected' : ''}`}
                          style={{ background: COLOR_HEX[c] }}
                          onClick={() => setCreating(s => s && ({ ...s, color: c }))}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="board-zone-create-actions">
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={confirmCreate}>Add</button>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setCreating(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {zoneBlocks.length === 0 && !isCreating && (
                  <div className="board-zone-empty">
                    {isDragOver ? 'drop here' : 'drop ideas here'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
