import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { errorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { InlineError } from '../components/InlineError';

type LocationState = {
  from?: string;
  registrationComplete?: boolean;
};

function locationState(value: unknown): LocationState {
  if (!value || typeof value !== 'object') return {};

  return {
    from:
      'from' in value && typeof value.from === 'string'
        ? value.from
        : undefined,
    registrationComplete:
      'registrationComplete' in value && value.registrationComplete === true,
  };
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = locationState(location.state);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await auth.login(email, password);
      void navigate(state.from ?? '/plans', { replace: true });
    } catch (loginError: unknown) {
      setError(errorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="login-title">
      <p className="eyebrow">Welcome back</p>
      <h1 id="login-title" className="page-title">
        Sign in to ReleaseGuard
      </h1>
      <p className="page-intro">Manage your plan and subscription lifecycle.</p>

      {state.registrationComplete ? (
        <p className="success-message" role="status">
          Account created. Sign in to continue.
        </p>
      ) : null}
      {error ? <InlineError message={error} /> : null}

      <form onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <button
          className="button button--full"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-alternative">
        New to ReleaseGuard? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}
