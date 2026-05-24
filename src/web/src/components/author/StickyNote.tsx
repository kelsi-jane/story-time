import type { Block } from '../../types';

interface Props {
  block: Block;
  onDragStart: (blockId: string) => void;
}

export default function StickyNote({ block, onDragStart }: Props) {
  return (
    <div
      className={`sticky sticky-${block.color}`}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', block.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(block.id);
      }}
    >
      <span>{block.title}</span>
      {block.tags.length > 0 && (
        <span className="sticky-tag">{block.tags[0]}</span>
      )}
    </div>
  );
}
