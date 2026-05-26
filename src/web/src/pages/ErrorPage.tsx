import { Link } from 'react-router-dom';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

interface ErrorConfig {
  icon: string;
  label: string;
  heading: string;
  body: string;
  retry: boolean;
  image?: string;
}

const ERRORS: Record<number, ErrorConfig> = {
  404: {
    icon: 'ti-book-off',
    label: 'lost chapter',
    heading: 'Page not found.',
    body: 'This page wandered off the shelf. Perhaps it was never written.',
    retry: false,
    image: '/illustrations/lantern.png',
  },
  403: {
    icon: 'ti-lock',
    label: 'restricted',
    heading: 'This book is closed to you.',
    body: "This section isn't yours to read. Reach out to the site owner if you think that's wrong.",
    retry: false,
    image: '/illustrations/closed-book.png',
  },
  503: {
    icon: 'ti-cloud-off',
    label: 'unavailable',
    heading: 'The library is closed.',
    body: "We're having trouble reaching the server. Check back in a moment.",
    retry: true,
  },
  418: {
    icon: 'ti-cup',
    label: "i'm a teapot",
    heading: 'Short and stout.',
    body: 'This server refuses to brew coffee.',
    retry: false,
    image: '/illustrations/teapot.png',
  },
};

const DEFAULT_ERROR: ErrorConfig = {
  icon: 'ti-alert-triangle',
  label: 'something broke',
  heading: 'An unexpected plot twist.',
  body: 'Something went wrong on our end. Give it a moment and try again.',
  retry: true,
};

export function ErrorPage({ status = 500 }: { status?: number }) {
  const config = ERRORS[status] ?? DEFAULT_ERROR;
  return (
    <div className="error-page">
      <div className="error-card">
        {config.image
          ? <img src={config.image} alt="" className="error-illustration" />
          : <i className={`ti ${config.icon} error-icon`} />
        }
        <p className="error-label">{config.label}</p>
        <h1 className="admin-page-heading">{config.heading}</h1>
        <p className="error-body">{config.body}</p>
        {config.retry ? (
          <button className="btn btn-secondary error-cta" onClick={() => window.location.reload()}>
            try again
          </button>
        ) : (
          <Link to="/" className="btn btn-secondary error-cta">
            ← back to stories
          </Link>
        )}
      </div>
    </div>
  );
}

export default function RouteErrorPage() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  return <ErrorPage status={status} />;
}
