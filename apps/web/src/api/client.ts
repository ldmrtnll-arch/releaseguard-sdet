const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type PublicUser = {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  updatedAt: string;
};

export type Plan = {
  billingInterval: 'monthly';
  code: 'starter' | 'professional' | 'business';
  id: string;
  name: string;
  priceCents: number;
};

export type Subscription = {
  cancelledAt: string | null;
  id: string;
  plan: Plan;
  startedAt: string;
  status: 'active' | 'cancelled';
};

type ErrorEnvelope = {
  error: { code: string; message: string };
};

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== 'object' || !('error' in value)) {
    return false;
  }

  const error = value.error;
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    return undefined;
  }

  return response.json();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      'ReleaseGuard is temporarily unavailable.',
      0,
    );
  }

  const body = await parseJson(response);

  if (!response.ok) {
    if (isErrorEnvelope(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status);
    }

    throw new ApiError(
      'UNEXPECTED_RESPONSE',
      'ReleaseGuard could not complete the request.',
      response.status,
    );
  }

  return body as T;
}

export const api = {
  health: () => request<{ service: string; status: 'ok' }>('/health'),
  register: (input: { email: string; name: string; password: string }) =>
    request<{ user: PublicUser }>('/api/v1/auth/register', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  login: (input: { email: string; password: string }) =>
    request<{ accessToken: string; user: PublicUser }>('/api/v1/auth/login', {
      body: JSON.stringify(input),
      method: 'POST',
    }),
  me: (accessToken: string) =>
    request<{ user: PublicUser }>('/api/v1/auth/me', {}, accessToken),
  listPlans: () => request<{ data: Plan[] }>('/api/v1/plans'),
  currentSubscription: (accessToken: string) =>
    request<{ data: Subscription }>(
      '/api/v1/subscriptions/current',
      {},
      accessToken,
    ),
  createSubscription: (accessToken: string, planId: string) =>
    request<{ data: Subscription }>(
      '/api/v1/subscriptions',
      { body: JSON.stringify({ planId }), method: 'POST' },
      accessToken,
    ),
  changePlan: (accessToken: string, planId: string) =>
    request<{ data: Subscription }>(
      '/api/v1/subscriptions/current',
      { body: JSON.stringify({ planId }), method: 'PATCH' },
      accessToken,
    ),
  cancelSubscription: (accessToken: string) =>
    request<{ data: Subscription }>(
      '/api/v1/subscriptions/current',
      { method: 'DELETE' },
      accessToken,
    ),
};
