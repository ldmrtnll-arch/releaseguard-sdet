CREATE TABLE payments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subscription_id uuid NOT NULL UNIQUE REFERENCES subscriptions(id) ON DELETE RESTRICT,
  provider_payment_id uuid NOT NULL UNIQUE,
  idempotency_key varchar(128) NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency char(3) NOT NULL,
  status varchar(20) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT payments_currency_supported CHECK (currency = 'USD'),
  CONSTRAINT payments_status_supported CHECK (status = 'approved')
);

CREATE INDEX payments_user_history
  ON payments (user_id, created_at DESC);
