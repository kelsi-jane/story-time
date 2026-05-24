import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createProject } from '../../api/planning';
import { TEMPLATES } from '../../data/templates';

interface Props {
  onCreated: (projectId: string) => void;
  onClose: () => void;
}

export default function ProjectNewModal({ onCreated, onClose }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState('7-point');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selected = TEMPLATES.find(t => t.id === selectedId)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const { projectId } = await createProject(user.username, title.trim(), selectedId);
      onCreated(projectId);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create project');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', width: '100%', maxWidth: 580, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>New story board</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-secondary)', lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '18px 20px' }}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Story title
              </label>
              <input
                className="input"
                type="text"
                placeholder="Give your story a name…"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              Starting structure{' '}
              <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: 11 }}>
                (optional — you can change slots any time)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 14 }}>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    border: selectedId === t.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: 10,
                    cursor: 'pointer',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ fontSize: 18, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                    <i className={`ti ${t.icon}`} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                    {t.slots.length > 0 ? `${t.slots.length} slots` : 'no slots'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{selected.name}</strong>{' — '}{selected.description}
              {selected.slots.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                  {selected.slots.map(s => (
                    <span key={s.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#EEEDFE', color: '#3C3489' }}>
                      {s.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && <p style={{ fontSize: 12, color: 'var(--color-danger, #c0392b)', marginBottom: 8 }}>{error}</p>}
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim() || submitting}>
              {submitting ? 'Creating…' : 'Create board →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
