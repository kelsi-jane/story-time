import type { ProjectChapter, PaneView } from '../../types';

interface Props {
  chapters: ProjectChapter[];
  current: PaneView;
  onSelect: (view: PaneView) => void;
}

export default function PaneViewPicker({ chapters, current, onSelect }: Props) {
  return (
    <div className="block-detail-slot-picker pane-view-picker">
      {chapters.length > 0 && (
        <>
          <div className="block-detail-nav-group-label pane-picker-group">
            <i className="ti ti-file-text" /> chapters
          </div>
          {chapters.map(ch => (
            <button
              key={ch.id}
              className={`block-detail-slot-option${current.kind === 'chapter' && current.chapterId === ch.id ? ' selected' : ''}`}
              onClick={() => onSelect({ kind: 'chapter', chapterId: ch.id })}
            >
              {ch.title}
            </button>
          ))}
        </>
      )}
      <div className="block-detail-nav-group-label pane-picker-group">
        <i className="ti ti-layout-list" /> reference
      </div>
      <button
        className={`block-detail-slot-option${current.kind === 'outline' ? ' selected' : ''}`}
        onClick={() => onSelect({ kind: 'outline' })}
      >
        <i className="ti ti-list-details pane-picker-icon" /> Outline
      </button>
      <button
        className={`block-detail-slot-option${current.kind === 'notes' ? ' selected' : ''}`}
        onClick={() => onSelect({ kind: 'notes' })}
      >
        <i className="ti ti-note pane-picker-icon" /> Notes
      </button>
    </div>
  );
}
