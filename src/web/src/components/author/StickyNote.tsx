import { useRef } from 'react';
import type { Block } from '../../types';

interface Props {
  block: Block;
  onDragStart: (blockId: string) => void;
  onClick: (blockId: string) => void;
  onPinToggle: (blockId: string) => void;
}

export default function StickyNote({ block, onDragStart, onClick, onPinToggle }: Props) {
  const dragged = useRef(false);

  return (
    <div
      className={`sticky sticky-${block.color}`}
      draggable
      onDragStart={e => {
        dragged.current = true;
        e.dataTransfer.setData('text/plain', block.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(block.id);
      }}
      onDragEnd={() => { dragged.current = false; }}
      onClick={() => { if (!dragged.current) onClick(block.id); }}
    >
      <span>{block.title}</span>
      <div className="sticky-footer">
        {block.tags.length > 0 && (
          <span className="sticky-tag">{block.tags[0]}</span>
        )}
        <button
          className={`sticky-pin${block.pinned ? ' pinned' : ''}`}
          title={block.pinned ? 'Pinned — stays on board when assigned to outline' : 'Pin to keep on board when assigned to outline'}
          onClick={e => { e.stopPropagation(); onPinToggle(block.id); }}
        >
          <i className="ti ti-pin" />
        </button>
      </div>
    </div>
  );
}
