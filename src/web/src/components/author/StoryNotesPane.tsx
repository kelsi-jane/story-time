import { useState } from 'react';
import type { Projection } from '../../types';
import BlockDetailContent from './BlockDetailContent';

interface Props {
  projection: Projection;
  projectId: string;
  onRefresh: () => Promise<void>;
}

export default function StoryNotesPane({ projection, projectId, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const boardSlots = projection.slots.filter(s => s.area === 'board');
  const activeBlocks = projection.blocks.filter(b => b.status !== 'archived');

  const groups = boardSlots
    .map(slot => ({
      slot,
      blocks: activeBlocks.filter(b => b.boardSlot === slot.id),
    }))
    .filter(g => g.blocks.length > 0);

  const selectedBlock = selectedId ? activeBlocks.find(b => b.id === selectedId) : null;

  if (selectedBlock) {
    return (
      <div className="story-notes-detail">
        <button className="story-note-back-btn" onClick={() => setSelectedId(null)} title="Back to notes">
          <i className="ti ti-arrow-left" /> notes
        </button>
        <BlockDetailContent
          key={selectedBlock.id}
          block={selectedBlock}
          projection={projection}
          projectId={projectId}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="story-notes-list">
      {groups.map(({ slot, blocks }) => (
        <div key={slot.id} className="block-detail-nav-group">
          <div className="block-detail-nav-group-label" style={{ pointerEvents: 'none' }}>
            {slot.label}
            <span className="block-detail-nav-group-count">{blocks.length}</span>
          </div>
          {blocks.map(b => (
            <div
              key={b.id}
              className="block-detail-nav-item"
              onClick={() => setSelectedId(b.id)}
            >
              <span className={`block-detail-nav-dot sticky-${b.color}`} />
              <span className="block-detail-nav-label">{b.title}</span>
              {b.pinned && <i className="ti ti-pin block-detail-nav-pin" />}
            </div>
          ))}
        </div>
      ))}
      {groups.length === 0 && (
        <p className="story-notes-empty">No notes yet.</p>
      )}
    </div>
  );
}
