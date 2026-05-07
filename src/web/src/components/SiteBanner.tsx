import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthor } from '../api';
import { getAuthUser } from '../api/auth';

const Hamburger = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
    <line x1="2" y1="4.5" x2="16" y2="4.5" />
    <line x1="2" y1="9"   x2="16" y2="9"   />
    <line x1="2" y1="13.5" x2="16" y2="13.5" />
  </svg>
);

interface Props {
  onAuth?: (username: string | null) => void;
}

export default function SiteBanner({ onAuth }: Props) {
  const [authUsername, setAuthUsername] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAuthUser().then(async (user) => {
      const username = user?.username ?? null;
      setAuthUsername(username);
      onAuth?.(username);
      if (user) {
        const author = await getAuthor(user.username);
        setWelcomeName(author?.fullName.trim().split(/\s+/)[0] || user.username);
      }
    });

    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="discovery-banner">
      <div className="discovery-banner-inner">
        <button className="discovery-banner-btn btn-placeholder" aria-label="Menu"><Hamburger /></button>
        <span className="site-banner-logo">Wistful.Me</span>
        {authUsername && welcomeName ? (
          <div className="site-banner-user" ref={profileRef} onClick={() => setMenuOpen((o) => !o)}>
            <span className="site-banner-welcome">Welcome, {welcomeName}</span>
            <img
              src={`https://github.com/${authUsername}.png?size=56`}
              alt={authUsername}
              className="site-banner-avatar"
            />
            {menuOpen && (
              <div className="profile-menu">
                <Link to="/settings" className="profile-menu-item">Settings</Link>
                <a
                  href={import.meta.env.DEV ? '/' : '/.auth/logout?post_logout_redirect_uri=/'}
                  className="profile-menu-item"
                >
                  Sign out
                </a>
              </div>
            )}
          </div>
        ) : (
          <a
            href={import.meta.env.DEV ? '#' : `/.auth/login/github?post_login_redirect_uri=${encodeURIComponent('/')}`}
            className="site-banner-signin"
          >
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}
