import { useEffect, useRef, useState } from 'react';
import type { ProjectChapter } from '../../types';

interface Props {
  chapters: ProjectChapter[];
  onExport: (chapterIds: string[]) => Promise<void>;
}

export default function ExportControl({ chapters, onExport }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function openPicker() {
    setMenuOpen(false);
    setSelectedIds(new Set(chapters.map(c => c.id)));
    setPickerOpen(true);
  }

  function toggleChapter(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(prev => prev.size === chapters.length ? new Set() : new Set(chapters.map(c => c.id)));
  }

  async function handleExportClick() {
    setExporting(true);
    try {
      await onExport([...selectedIds]);
      setPickerOpen(false);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="board-toolbar-export" ref={ref}>
        <button className="board-toolbar-btn" onClick={() => setMenuOpen(o => !o)} title="Export chapters">
          <i className="ti ti-download" /> export
        </button>
        {menuOpen && (
          <div className="block-detail-slot-picker">
            <button className="block-detail-slot-option" onClick={openPicker}>
              Markdown (.md)
            </button>
            <button className="block-detail-slot-option" disabled>
              Word (.docx) <span className="export-menu-item-badge">soon</span>
            </button>
            <button className="block-detail-slot-option" disabled>
              PDF (.pdf) <span className="export-menu-item-badge">soon</span>
            </button>
            <button className="block-detail-slot-option" disabled>
              Link share <span className="export-menu-item-badge">soon</span>
            </button>
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !exporting) setPickerOpen(false); }}>
          <div className="modal-card">
            <div className="modal-header">
              <span>Export chapters</span>
              <button onClick={() => setPickerOpen(false)} disabled={exporting}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="export-chapter-select-all">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === chapters.length && chapters.length > 0}
                    onChange={toggleAll}
                  />
                  Select all
                </label>
              </div>
              <div className="export-chapter-list">
                {chapters.map((c, idx) => (
                  <label key={c.id} className="export-chapter-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleChapter(c.id)}
                    />
                    <span className="chapter-row-num">{idx + 1}</span>
                    {c.title}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPickerOpen(false)} disabled={exporting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExportClick} disabled={exporting || selectedIds.size === 0}>
                {exporting ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
