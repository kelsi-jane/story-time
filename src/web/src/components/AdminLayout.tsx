import { Link } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  breadcrumb?: string;
}

export default function AdminLayout({ children, breadcrumb }: Props) {
  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <nav style={styles.nav}>
          <Link to="/" style={styles.siteLink}>Story Time</Link>
          <span style={styles.separator}>/</span>
          <Link to="/admin" style={styles.adminLink}>Admin</Link>
          {breadcrumb && (
            <>
              <span style={styles.separator}>/</span>
              <span style={styles.breadcrumb}>{breadcrumb}</span>
            </>
          )}
        </nav>
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
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '40px 24px',
  },
};
