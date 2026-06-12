// CUSTOMIZATION GUIDE FOR FORK OPERATORS
// ─────────────────────────────────────────────────────────────────────────
// Set these in .env.local (local) or Azure App Settings (production):
//   VITE_SITE_NAME      — display name shown as the page heading
//   VITE_SITE_TAGLINE   — one-line description shown under the name
//
// Replace the static <p> description below with your own copy.
// Wire up /about and /guidelines routes when those pages are created.
// ─────────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';

const SITE_NAME = import.meta.env.VITE_SITE_NAME as string | undefined;
const SITE_TAGLINE = import.meta.env.VITE_SITE_TAGLINE as string | undefined;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <main className="landing-main">
        <header className="landing-header">
          <h1 className="landing-site-name">
            {SITE_NAME ?? '[Your Site Name]'}
          </h1>
          {SITE_TAGLINE && (
            <p className="landing-tagline">{SITE_TAGLINE}</p>
          )}
        </header>
        <p className="landing-description">
          {/* [PLACEHOLDER: Replace with 1–3 sentences describing your site.
              E.g. "A place to share original fiction. Stories are added by invitation.
              Readers are always welcome." */}
          A place to share original stories.
        </p>
        <div className="landing-actions">
          <Link to="/content" className="btn btn-primary landing-cta">
            Browse Stories
          </Link>
        </div>
        <nav className="landing-nav">
          <Link to="/about" className="landing-nav-link">About</Link>
          <Link to="/guidelines" className="landing-nav-link">Guidelines</Link>
        </nav>
      </main>
    </div>
  );
}
