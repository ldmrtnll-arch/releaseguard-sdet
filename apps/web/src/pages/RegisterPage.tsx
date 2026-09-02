import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import { InlineError } from '../components/InlineError';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.register({ email, name, password });
      void navigate('/login', {
        replace: true,
        state: { registrationComplete: true },
      });
    } catch (registerError: unknown) {
      setError(errorMessage(registerError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="register-title">
      <p className="eyebrow">Start your subscription</p>
      <h1 id="register-title" className="page-title">
        Create your account
      </h1>
      <p className="page-intro">
        One account, one active plan, no hidden setup.
      </p>

      {error ? <InlineError message={error} /> : null}

      <form onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            autoComplete="name"
            id="name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </div>
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
            aria-describedby="password-requirements"
            autoComplete="new-password"
            id="password"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <small id="password-requirements">Use at least 8 characters.</small>
        </div>
        <button
          className="button button--full"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-alternative">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
