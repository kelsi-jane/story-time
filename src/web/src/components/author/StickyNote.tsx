import type { Block } from '../../types';

interface Props {
  block: Block;
}

export default function StickyNote({ block }: Props) {
  return (
    <div className={`sticky sticky-${block.color}`}>
      <span>{block.title}</span>
      {block.tags.length > 0 && (
        <span className="sticky-tag">{block.tags[0]}</span>
      )}
    </div>
  );
}
