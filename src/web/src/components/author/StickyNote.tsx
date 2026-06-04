import { useRef } from 'react';
import type { Block } from '../../types';

interface Props {
  block: Block;
  isChapterLinked?: boolean;
  onDragStart: (blockId: string) => void;
  onClick: (blockId: string) => void;
  onPinToggle: (blockId: string) => void;
}

export default function StickyNote({ block, isChapterLinked, onDragStart, onClick, onPinToggle }: Props) {
  const dragged = useRef(false);
  const isArchived = block.status === 'archived';

  return (
    <div
      className={`sticky sticky-${block.color}${isArchived ? ' sticky-archived' : ''}`}
      draggable={!isArchived}
      onDragStart={isArchived ? undefined : e => {
        dragged.current = true;
        e.dataTransfer.setData('text/plain', block.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(block.id);
      }}
      onDragEnd={isArchived ? undefined : () => { dragged.current = false; }}
      onClick={() => { if (!dragged.current) onClick(block.id); }}
    >
      <span>{block.title}</span>
      <div className="sticky-footer">
        {block.tags.length > 0 && (
          <span className="sticky-tag">{block.tags[0]}</span>
        )}
        {isChapterLinked && <i className="ti ti-book sticky-chapter-icon" title="Linked to an official chapter" />}
        {isArchived ? (
          <span className="sticky-archived-badge">archived</span>
        ) : (
          <button
            className={`sticky-pin${block.pinned ? ' pinned' : ''}`}
            title={block.pinned ? 'Pinned — stays on board when assigned to outline' : 'Pin to keep on board when assigned to outline'}
            onClick={e => { e.stopPropagation(); onPinToggle(block.id); }}
          >
            <i className="ti ti-pin" />
          </button>
        )}
      </div>
    </div>
  );
}
