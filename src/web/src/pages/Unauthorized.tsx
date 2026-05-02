import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="page-card" style={{ maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Access restricted
        </p>
        <h1 className="admin-page-heading">You're not on the list.</h1>
        <p style={{ fontFamily: 'Lora, serif', fontSize: 15, fontStyle: 'italic', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          This site is managed by a private team. If you believe this is a mistake,
          reach out to the site owner.
        </p>
        <Link to="/" className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
          ← Back to stories
        </Link>
      </div>
    </div>
  );
}
