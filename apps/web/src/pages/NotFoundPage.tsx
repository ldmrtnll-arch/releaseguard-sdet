import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="empty-state">
      <p className="eyebrow">404</p>
      <h1 className="page-title">Page not found</h1>
      <Link className="button" to="/">
        Return home
      </Link>
    </section>
  );
}
