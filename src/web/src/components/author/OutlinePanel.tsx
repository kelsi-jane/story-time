import type { Block, Slot } from '../../types';

interface Props {
  slots: Slot[];
  blocks: Block[];
}

export default function OutlinePanel({ slots, blocks }: Props) {
  const outlineSlots = slots.filter(s => s.area === 'outline' && !s.hidden);

  return (
    <div className="board-outline-panel">
      <div className="outline-panel-header">
        <span className="outline-panel-title">outline</span>
      </div>
      <div className="outline-panel-body">
        {outlineSlots.map(slot => {
          const assigned = blocks.filter(b => b.slot === slot.id && b.status === 'active');
          const colorClass = `outline-slot-color-${slot.order % 6}`;
          return (
            <div key={slot.id} className="outline-slot">
              <div className={`outline-slot-header ${colorClass}`}>
                <span>{slot.label}</span>
                <span className="outline-slot-num">pt {slot.order + 1}</span>
              </div>
              {assigned.length === 0 ? (
                <div className="outline-slot-empty">drop a block here</div>
              ) : (
                assigned.map(b => (
                  <div key={b.id} className="outline-slot-item">
                    <i className="ti ti-note" />
                    {b.title}
                  </div>
                ))
              )}
            </div>
          );
        })}
        {outlineSlots.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', padding: '12px 8px', fontStyle: 'italic' }}>
            No outline slots — pick a template when creating a project, or add slots manually.
          </p>
        )}
      </div>
    </div>
  );
}
