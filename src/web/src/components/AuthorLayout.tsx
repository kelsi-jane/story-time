import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SiteBanner from './SiteBanner';

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
      <SiteBanner />
      <nav className="author-breadcrumb">
        <Link to="/author" className="author-breadcrumb-link">Author Studio</Link>
        {breadcrumb && (
          <>
            <span className="author-breadcrumb-sep">/</span>
            <span className="author-breadcrumb-current">{breadcrumb}</span>
          </>
        )}
      </nav>
      <main className="author-main">{children}</main>
    </div>
  );
}
