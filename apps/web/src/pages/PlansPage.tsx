import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, ApiError, type Plan, type Subscription } from '../api/client';
import { errorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { InlineError } from '../components/InlineError';
import { formatMonthlyPrice } from '../format';

export function PlansPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const planResponse = await api.listPlans();
        if (!active) return;
        setPlans(planResponse.data);

        if (auth.accessToken) {
          try {
            const subscription = await api.currentSubscription(
              auth.accessToken,
            );
            if (active) setCurrent(subscription.data);
          } catch (subscriptionError: unknown) {
            if (
              subscriptionError instanceof ApiError &&
              subscriptionError.code === 'UNAUTHORIZED'
            ) {
              auth.logout();
            } else if (!(
              subscriptionError instanceof ApiError &&
              subscriptionError.code === 'SUBSCRIPTION_NOT_FOUND'
            )) {
              throw subscriptionError;
            }
          }
        }
      } catch (loadError: unknown) {
        if (active) setError(errorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [auth.accessToken]);

  async function choosePlan(plan: Plan) {
    if (!auth.accessToken) {
      void navigate('/login');
      return;
    }

    setPendingPlanId(plan.id);
    setError(null);

    try {
      if (current) {
        await api.changePlan(auth.accessToken, plan.id);
      } else {
        await api.createSubscription(auth.accessToken, plan.id);
      }
      void navigate('/subscription');
    } catch (mutationError: unknown) {
      setError(errorMessage(mutationError));
      setPendingPlanId(null);
    }
  }

  return (
    <section className="content-page" aria-labelledby="plans-title">
      <p className="eyebrow">Simple, predictable pricing</p>
      <h1 id="plans-title" className="page-title">
        Choose a plan that fits
      </h1>
      <p className="page-intro">
        Upgrade or cancel without billing surprises in this controlled quality
        lab.
      </p>

      {error ? <InlineError message={error} /> : null}
      {loading ? <p role="status">Loading plans…</p> : null}

      {!loading && plans.length > 0 ? (
        <div className="plan-grid">
          {plans.map((plan) => {
            const isCurrent = current?.plan.id === plan.id;
            const isPending = pendingPlanId === plan.id;
            const action = current
              ? `Change to ${plan.name}`
              : `Choose ${plan.name}`;

            return (
              <article
                className={`plan-card ${isCurrent ? 'plan-card--current' : ''}`}
                key={plan.id}
              >
                {isCurrent ? (
                  <p className="current-badge">Current plan</p>
                ) : null}
                <h2>{plan.name}</h2>
                <p className="plan-price">
                  {formatMonthlyPrice(plan.priceCents)}
                </p>
                <p className="plan-copy">
                  Reliable monthly access with no hidden state.
                </p>
                <button
                  className="button button--full"
                  disabled={isCurrent || pendingPlanId !== null}
                  onClick={() => void choosePlan(plan)}
                >
                  {isCurrent
                    ? `Current plan: ${plan.name}`
                    : isPending
                      ? 'Updating…'
                      : action}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
