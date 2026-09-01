CREATE TABLE plans (
  id uuid PRIMARY KEY,
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  price_cents integer NOT NULL,
  billing_interval varchar(20) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_code_unique UNIQUE (code),
  CONSTRAINT plans_code_normalized CHECK (code = lower(btrim(code))),
  CONSTRAINT plans_price_non_negative CHECK (price_cents >= 0),
  CONSTRAINT plans_billing_interval_supported CHECK (billing_interval = 'monthly')
);

INSERT INTO plans (id, code, name, price_cents, billing_interval)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'starter', 'Starter', 900, 'monthly'),
  ('00000000-0000-4000-8000-000000000002', 'professional', 'Professional', 2900, 'monthly'),
  ('00000000-0000-4000-8000-000000000003', 'business', 'Business', 7900, 'monthly')
ON CONFLICT (code) DO NOTHING;
