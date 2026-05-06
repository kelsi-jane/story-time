import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export interface ReaderPanelItem {
  label: string;
  href: string;
}

export interface ReaderPanelSection {
  heading: string;
  items: ReaderPanelItem[];
  hasMore?: boolean;
}

interface Props {
  sections: ReaderPanelSection[];
}

export default function ReaderPanel({ sections }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const didDrag = useRef(false);
  const [dragging, setDragging] = useState(false);

  function onMouseDown(e: React.MouseEvent) {
    if (!panelRef.current) return;
    dragStart.current = { x: e.pageX, scrollLeft: panelRef.current.scrollLeft };
    didDrag.current = false;
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current || !panelRef.current) return;
    const dx = e.pageX - dragStart.current.x;
    if (Math.abs(dx) > 5) didDrag.current = true;
    panelRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }

  function onDragEnd() {
    dragStart.current = null;
    setDragging(false);
  }

  function onClickCapture(e: React.MouseEvent) {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  }

  if (sections.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="reader-panel"
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onClickCapture={onClickCapture}
    >
      {sections.map((section) => (
        <div key={section.heading} className="reader-panel-section">
          <h2 className="reader-panel-heading">{section.heading}</h2>
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />
          <ul className="reader-panel-list">
            {section.items.map((item) => (
              <li key={item.href} className="reader-panel-item">
                <Link to={item.href} draggable={false}>{item.label}</Link>
              </li>
            ))}
          </ul>
          {section.hasMore && (
            <Link to="#" className="reader-panel-more">…more</Link>
          )}
        </div>
      ))}
    </div>
  );
}
