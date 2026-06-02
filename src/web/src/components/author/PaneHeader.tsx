import { useEffect, useRef, useState } from 'react';
import type { ProjectChapter, PaneView } from '../../types';
import PaneViewPicker from './PaneViewPicker';

interface Props {
  view: PaneView;
  chapters: ProjectChapter[];
  onSelect: (view: PaneView) => void;
  onClear: () => void;
}

const VIEW_LABELS: Record<Exclude<PaneView['kind'], 'chapter'>, string> = {
  empty: 'choose a view',
  outline: 'outline',
  notes: 'notes',
};

function viewLabel(view: PaneView, chapters: ProjectChapter[]): string {
  if (view.kind === 'chapter') {
    return chapters.find(c => c.id === view.chapterId)?.title ?? 'chapter';
  }
  return VIEW_LABELS[view.kind];
}

export default function PaneHeader({ view, chapters, onSelect, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function handleSelect(v: PaneView) {
    onSelect(v);
    setOpen(false);
  }

  const isEmpty = view.kind === 'empty';

  return (
    <div className="story-pane-header" ref={ref}>
      <button
        className={`story-pane-header-btn${isEmpty ? ' empty' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {viewLabel(view, chapters)}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'} story-pane-header-chevron`} />
      </button>
      {!isEmpty && (
        <button
          className="story-pane-header-clear"
          title="Clear pane"
          onClick={onClear}
        >
          <i className="ti ti-x" />
        </button>
      )}
      {open && (
        <PaneViewPicker
          chapters={chapters}
          current={view}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
