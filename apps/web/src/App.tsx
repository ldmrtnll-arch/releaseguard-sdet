import { useEffect, useState } from 'react';

type ApiStatus = 'checking' | 'available' | 'unavailable';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Health check returned ${response.status}`);
        }

        setApiStatus('available');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiStatus('unavailable');
      }
    }

    void checkApi();

    return () => controller.abort();
  }, []);

  const statusLabel = {
    available: 'API available',
    checking: 'Checking API availability',
    unavailable: 'API unavailable',
  }[apiStatus];

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="ReleaseGuard home">
          <span className="brand-mark" aria-hidden="true">
            RG
          </span>
          ReleaseGuard
        </a>
        <span className="phase-label">SDET Foundation</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">Subscription Platform</p>
          <h1 id="page-title">Quality engineered into every release.</h1>
          <p className="intro">
            A controlled SaaS platform built to demonstrate reliable test
            automation, observable systems, and pragmatic quality engineering.
          </p>

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
      </main>

      <footer>
        <p>ReleaseGuard · Phase 2</p>
      </footer>
    </div>
  );
}
