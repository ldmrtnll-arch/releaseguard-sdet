import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api, ApiError, type Subscription } from '../api/client';
import { errorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { InlineError } from '../components/InlineError';
import { formatDate, formatMonthlyPrice } from '../format';

export function SubscriptionPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!auth.accessToken) return;

      try {
        const response = await api.currentSubscription(auth.accessToken);
        if (active) setSubscription(response.data);
      } catch (loadError: unknown) {
        if (
          loadError instanceof ApiError &&
          loadError.code === 'SUBSCRIPTION_NOT_FOUND'
        ) {
          if (active) setSubscription(null);
        } else if (
          loadError instanceof ApiError &&
          loadError.code === 'UNAUTHORIZED'
        ) {
          auth.logout();
          void navigate('/login', { replace: true });
        } else if (active) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [auth.accessToken]);

  function closeDialog() {
    dialogRef.current?.close();
    cancelTriggerRef.current?.focus();
  }

  async function confirmCancellation() {
    if (!auth.accessToken) return;
    setCancelling(true);
    setError(null);

    try {
      await api.cancelSubscription(auth.accessToken);
      dialogRef.current?.close();
      setSubscription(null);
    } catch (cancelError: unknown) {
      setError(errorMessage(cancelError));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="content-page" aria-labelledby="subscription-title">
      <p className="eyebrow">Your subscription</p>
      <h1 id="subscription-title" className="page-title">
        Subscription overview
      </h1>

      {error ? <InlineError message={error} /> : null}
      {loading ? <p role="status">Loading your subscription…</p> : null}

      {!loading && !subscription ? (
        <div className="empty-state">
          <h2>No active subscription</h2>
          <p>Choose a plan whenever you are ready to subscribe again.</p>
          <Link className="button" to="/plans">
            Choose a plan
          </Link>
        </div>
      ) : null}

      {!loading && subscription ? (
        <article className="subscription-card">
          <div>
            <p className="current-badge">Active subscription</p>
            <h2>{subscription.plan.name}</h2>
            <p className="plan-price">
              {formatMonthlyPrice(subscription.plan.priceCents)}
            </p>
          </div>
          <dl className="subscription-details">
            <div>
              <dt>Status</dt>
              <dd>{subscription.status}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{formatDate(subscription.startedAt)}</dd>
            </div>
          </dl>
          <div className="subscription-actions">
            <Link className="button" to="/plans">
              Change plan
            </Link>
            <button
              className="button button--danger"
              onClick={() => dialogRef.current?.showModal()}
              ref={cancelTriggerRef}
            >
              Cancel subscription
            </button>
          </div>
        </article>
      ) : null}

      <dialog
        aria-labelledby="cancel-title"
        className="cancel-dialog"
        onCancel={closeDialog}
        ref={dialogRef}
      >
        <h2 id="cancel-title">Cancel your subscription?</h2>
        <p>
          Your access will end now. You can choose another plan at any time.
        </p>
        <div className="dialog-actions">
          <button
            autoFocus
            className="button button--secondary"
            onClick={closeDialog}
          >
            Keep subscription
          </button>
          <button
            className="button button--danger"
            disabled={cancelling}
            onClick={() => void confirmCancellation()}
          >
            {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
          </button>
        </div>
      </dialog>
    </section>
  );
}
