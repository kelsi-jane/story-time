import { useState } from 'react';
import type { Block, OutlineAssignment, Slot } from '../../types';

interface Props {
  slots: Slot[];
  blocks: Block[];
  outlineAssignments: OutlineAssignment[];
  onBlockAssigned: (blockId: string, fromSlot: string, toSlot: string) => void;
  onBlockUnassigned: (blockId: string, fromSlot: string) => void;
  onBlockClick: (blockId: string) => void;
}

export default function OutlinePanel({ slots, blocks, outlineAssignments, onBlockAssigned, onBlockUnassigned, onBlockClick }: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const outlineSlots = slots.filter(s => s.area === 'outline' && !s.hidden);

  function handleDrop(e: React.DragEvent, toSlotId: string) {
    e.preventDefault();
    setDragOverSlot(null);
    const blockId = e.dataTransfer.getData('text/plain');
    if (!blockId) return;
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.slot === toSlotId) return;
    onBlockAssigned(blockId, block.slot, toSlotId);
  }

  return (
    <div className="board-outline-panel">
      <div className="outline-panel-header">
        <span className="outline-panel-title">outline</span>
      </div>
      <div className="outline-panel-body">
        {outlineSlots.map(slot => {
          const moved = blocks.filter(b => b.slot === slot.id && b.status === 'active');
          const referenced = outlineAssignments
            .filter(a => a.slotId === slot.id)
            .map(a => blocks.find(b => b.id === a.blockId))
            .filter((b): b is Block => !!b && b.status === 'active');
          const assigned = [...moved, ...referenced];
          const colorClass = `outline-slot-color-${slot.order % 6}`;
          const isDragOver = dragOverSlot === slot.id;

          return (
            <div
              key={slot.id}
              className={`outline-slot${isDragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverSlot(slot.id); }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverSlot(null);
                }
              }}
              onDrop={e => handleDrop(e, slot.id)}
            >
              <div className={`outline-slot-header ${colorClass}`}>
                <span>{slot.label}</span>
                <span className="outline-slot-num">pt {slot.order + 1}</span>
              </div>
              {assigned.length === 0 ? (
                <div className="outline-slot-empty">
                  {isDragOver ? 'drop here' : 'drop a note here'}
                </div>
              ) : (
                assigned.map(b => (
                  <div key={b.id} className="outline-slot-item">
                    <i className={b.pinned ? 'ti ti-pin' : 'ti ti-note'} />
                    <button className="outline-slot-item-title" onClick={() => onBlockClick(b.id)}>{b.title}</button>
                    <button
                      className="outline-slot-return"
                      title="Return to board"
                      onClick={() => onBlockUnassigned(b.id, slot.id)}
                    >
                      <i className="ti ti-arrow-back-up" />
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })}
        {outlineSlots.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', padding: '12px 8px', fontStyle: 'italic' }}>
            No outline slots — pick a template when creating a project, or add slots manually.
          </p>
        )}
      </div>
    </div>
  );
}
