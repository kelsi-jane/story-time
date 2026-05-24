import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  breadcrumb?: string;
}

export default function AuthorLayout({ children, breadcrumb }: Props) {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!import.meta.env.DEV) {
        window.location.href = `/.auth/login/github?post_login_redirect_uri=${encodeURIComponent(window.location.pathname)}`;
      }
    } else if (!isAdmin) {
      navigate('/unauthorized', { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading) return (
    <div className="author-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading…</span>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="author-shell">
      <header className="author-header">
        <nav className="author-nav">
          <Link to="/" className="author-nav-link">Wistful.Me</Link>
          <span className="author-nav-separator">/</span>
          <Link to="/author" className="author-nav-link muted">Author</Link>
          {breadcrumb && (
            <>
              <span className="author-nav-separator">/</span>
              <span className="author-nav-link muted">{breadcrumb}</span>
            </>
          )}
        </nav>
        <div className="author-header-actions">
          <a
            href={import.meta.env.DEV ? '/' : '/.auth/logout?post_logout_redirect_uri=/'}
            className="author-header-action"
          >
            Sign out
          </a>
        </div>
      </header>
      <main className="author-main">{children}</main>
    </div>
  );
}
