import { useState } from 'react';
import type { Block, OutlineAssignment, Slot } from '../../types';

interface Props {
  slots: Slot[];
  blocks: Block[];
  outlineAssignments: OutlineAssignment[];
  outlineOrder: Record<string, string[]>;
  onBlockAssigned: (blockId: string, fromSlot: string, toSlot: string) => void;
  onBlockUnassigned: (blockId: string, fromSlot: string) => void;
  onBlockClick: (blockId: string) => void;
  onOutlineReordered: (slotId: string, orderedBlockIds: string[]) => void;
}

export default function OutlinePanel({ slots, blocks, outlineAssignments, outlineOrder = {}, onBlockAssigned, onBlockUnassigned, onBlockClick, onOutlineReordered }: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [reorderDrag, setReorderDrag] = useState<{ blockId: string; slotId: string } | null>(null);
  const [reorderInsertBefore, setReorderInsertBefore] = useState<{ slotId: string; index: number } | null>(null);

  const outlineSlots = slots.filter(s => s.area === 'outline' && !s.hidden);

  function sortAssigned(items: Block[], slotId: string): Block[] {
    const order = outlineOrder[slotId];
    if (!order || order.length === 0) return items;
    return [...items].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
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
          const assigned = sortAssigned([...moved, ...referenced], slot.id);
          const colorClass = `outline-slot-color-${slot.order % 6}`;
          const isDragOver = dragOverSlot === slot.id;
          const isReordering = reorderDrag?.slotId === slot.id;

          return (
            <div
              key={slot.id}
              className={`outline-slot${isDragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); if (!isReordering) setDragOverSlot(slot.id); }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverSlot(null);
                  if (isReordering) setReorderInsertBefore(null);
                }
              }}
              onDrop={e => {
                e.preventDefault();
                setDragOverSlot(null);

                const reorderBlockId = e.dataTransfer.getData('outline-reorder');
                if (reorderBlockId && reorderDrag?.slotId === slot.id) {
                  const insertAt = reorderInsertBefore?.slotId === slot.id ? reorderInsertBefore.index : assigned.length;
                  const fromIndex = assigned.findIndex(b => b.id === reorderBlockId);
                  const ids = assigned.map(b => b.id);
                  ids.splice(fromIndex, 1);
                  ids.splice(insertAt > fromIndex ? insertAt - 1 : insertAt, 0, reorderBlockId);
                  onOutlineReordered(slot.id, ids);
                  setReorderDrag(null);
                  setReorderInsertBefore(null);
                  return;
                }

                const blockId = e.dataTransfer.getData('text/plain');
                if (!blockId) return;
                const block = blocks.find(b => b.id === blockId);
                if (!block || block.slot === slot.id) return;
                onBlockAssigned(blockId, block.slot, slot.id);
              }}
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
                <>
                  {assigned.map((b, i) => (
                    <div key={b.id}>
                      {isReordering && reorderInsertBefore?.slotId === slot.id && reorderInsertBefore.index === i && (
                        <div className="outline-reorder-indicator" />
                      )}
                      <div
                        className={`outline-slot-item${reorderDrag?.blockId === b.id ? ' dragging' : ''}${b.boardSlot === 'chapters' ? ' chapter' : ''}`}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('outline-reorder', b.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setReorderDrag({ blockId: b.id, slotId: slot.id });
                        }}
                        onDragEnd={() => {
                          setReorderDrag(null);
                          setReorderInsertBefore(null);
                        }}
                        onDragOver={e => {
                          if (!isReordering) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const insertIndex = e.clientY < rect.top + rect.height / 2 ? i : i + 1;
                          setReorderInsertBefore({ slotId: slot.id, index: insertIndex });
                        }}
                      >
                        <i className="ti ti-grip-vertical outline-slot-drag-handle" />
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
                    </div>
                  ))}
                  {isReordering && reorderInsertBefore?.slotId === slot.id && reorderInsertBefore.index === assigned.length && (
                    <div className="outline-reorder-indicator" />
                  )}
                </>
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
