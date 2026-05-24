import { useRef } from 'react';
import type { Block } from '../../types';

interface Props {
  block: Block;
  onDragStart: (blockId: string) => void;
  onClick: (blockId: string) => void;
}

export default function StickyNote({ block, onDragStart, onClick }: Props) {
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
      {block.tags.length > 0 && (
        <span className="sticky-tag">{block.tags[0]}</span>
      )}
    </div>
  );
}
