import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  breadcrumb?: string;
}

export default function AdminLayout({ children, breadcrumb }: Props) {
  const { isAdmin, isPrimary, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/unauthorized', { replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading…</span>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <nav style={styles.nav}>
          <Link to="/" style={styles.siteLink}>Wistful.Me</Link>
          <span style={styles.separator}>/</span>
          <Link to="/admin" style={styles.adminLink}>Admin</Link>
          {breadcrumb && (
            <>
              <span style={styles.separator}>/</span>
              <span style={styles.breadcrumb}>{breadcrumb}</span>
            </>
          )}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {isPrimary && (
            <Link to="/admin/admins" style={styles.headerLink}>Manage admins</Link>
          )}
          <a
            href={import.meta.env.DEV ? '/' : '/.auth/logout?post_logout_redirect_uri=/'}
            style={styles.headerLink}
          >
            Sign out
          </a>
        </div>
      </header>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: 'var(--color-background)',
  },
  header: {
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    padding: '0 24px',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  siteLink: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    textDecoration: 'none',
  },
  adminLink: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  separator: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-border)',
  },
  breadcrumb: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
  },
  headerLink: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '40px 24px',
  },
};
