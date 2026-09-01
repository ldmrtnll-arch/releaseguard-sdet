CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_supported CHECK (status IN ('active', 'cancelled')),
  CONSTRAINT subscriptions_cancellation_consistent CHECK (
    (status = 'active' AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX subscriptions_one_active_per_user
  ON subscriptions (user_id)
  WHERE status = 'active';

CREATE INDEX subscriptions_user_history
  ON subscriptions (user_id, created_at DESC);
