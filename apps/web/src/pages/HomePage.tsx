import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';

type ApiStatus = 'available' | 'checking' | 'unavailable';

export function HomePage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    let active = true;

    void api
      .health()
      .then(() => {
        if (active) setApiStatus('available');
      })
      .catch(() => {
        if (active) setApiStatus('unavailable');
      });

    return () => {
      active = false;
    };
  }, []);

  const statusLabel = {
    available: 'API available',
    checking: 'Checking API availability',
    unavailable: 'API unavailable',
  }[apiStatus];

  return (
    <section className="hero" aria-labelledby="page-title">
      <p className="eyebrow">Subscription quality laboratory</p>
      <h1 id="page-title">Quality engineered into every release.</h1>
      <p className="intro">
        Explore a focused SaaS subscription experience backed by real APIs and
        an automation architecture designed for reliable releases.
      </p>

      <div className="hero-actions">
        <Link className="button" to="/plans">
          Explore plans
        </Link>
        <Link className="button button--secondary" to="/register">
          Create account
        </Link>
      </div>

      <div
        className={`system-status system-status--${apiStatus}`}
        role="status"
      >
        <span className="status-dot" aria-hidden="true" />
        <span>
          <strong>System status</strong>
          {statusLabel}
        </span>
      </div>
    </section>
  );
}
