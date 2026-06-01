import { useRef, useState, useEffect } from 'react';
import type { Chapter, PaneView } from '../../types';
import PaneViewPicker from './PaneViewPicker';

interface Props {
  chapters: Chapter[];
  onSelect: (view: PaneView) => void;
}

export default function PaneEmpty({ chapters, onSelect }: Props) {
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

  return (
    <div className="story-pane-empty">
      <div className="story-pane-empty-inner" ref={ref}>
        <button
          className="story-pane-empty-btn"
          onClick={() => setOpen(o => !o)}
        >
          <i className="ti ti-layout-grid-add" />
          choose a view
        </button>
        {open && (
          <PaneViewPicker
            chapters={chapters}
            current={{ kind: 'empty' }}
            onSelect={handleSelect}
          />
        )}
      </div>
    </div>
  );
}
