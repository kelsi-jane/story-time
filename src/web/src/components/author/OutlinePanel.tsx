import { useState } from 'react';
import type { Block, Slot } from '../../types';

interface Props {
  slots: Slot[];
  blocks: Block[];
  onBlockAssigned: (blockId: string, fromSlot: string, toSlot: string) => void;
}

export default function OutlinePanel({ slots, blocks, onBlockAssigned }: Props) {
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
          const assigned = blocks.filter(b => b.slot === slot.id && b.status === 'active');
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
                  {isDragOver ? 'drop here' : 'drop a block here'}
                </div>
              ) : (
                assigned.map(b => (
                  <div key={b.id} className="outline-slot-item">
                    <i className="ti ti-note" />
                    {b.title}
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
