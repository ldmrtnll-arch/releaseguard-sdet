import { check, fail } from 'k6';

import { performanceConfig } from '../config.js';
import { get, json, post } from './http.js';

export function prepareUsers(count) {
  const users = [];

  for (let index = 0; index < count; index += 1) {
    const email = `perf.user.${performanceConfig.runId}.${index}@releaseguard.test`;
    const credentials = { email, password: performanceConfig.password };
    const registerResponse = post(
      '/api/v1/auth/register',
      { ...credentials, name: `Performance User ${index}` },
      { operation: 'setup-register' },
    );

    if (
      !check(registerResponse, {
        'setup registration returns 201': (response) => response.status === 201,
      })
    ) {
      fail(
        `Performance user registration failed with ${registerResponse.status}`,
      );
    }

    const loginResponse = post('/api/v1/auth/login', credentials, {
      operation: 'setup-login',
    });
    const loginBody = json(loginResponse);

    if (
      !check(loginResponse, {
        'setup login returns a token': (response) =>
          response.status === 200 && typeof loginBody?.accessToken === 'string',
      })
    ) {
      fail(`Performance user login failed with ${loginResponse.status}`);
    }

    users.push({ email, token: loginBody.accessToken });
  }

  return { users };
}

export function warmUpSmoke(data) {
  const readyResponse = get('/health/ready', { operation: 'warmup-ready' });
  const ready = check(readyResponse, {
    'warm-up readiness returns 200': (response) => response.status === 200,
  });

  const plansResponse = get('/api/v1/plans', { operation: 'warmup-plans' });
  const plansBody = json(plansResponse);
  const plans = check(plansResponse, {
    'warm-up plans returns three plans': (response) =>
      response.status === 200 && plansBody?.data?.length === 3,
  });

  const warmUpUser = data.users[data.users.length - 1];
  const authenticatedResponse = get('/api/v1/auth/me', {
    operation: 'warmup-authenticated-read',
    token: warmUpUser.token,
  });
  const authenticatedBody = json(authenticatedResponse);
  const authenticated = check(authenticatedResponse, {
    'warm-up authenticated read returns current user': (response) =>
      response.status === 200 &&
      typeof authenticatedBody?.user?.id === 'string',
  });

  const subscriptionResponse = post(
    '/api/v1/subscriptions',
    { planId: performanceConfig.starterPlanId },
    {
      idempotencyKey: `perf-${performanceConfig.runId}-warmup`,
      operation: 'warmup-subscription-write',
      token: warmUpUser.token,
    },
  );
  const subscriptionBody = json(subscriptionResponse);
  const subscription = check(subscriptionResponse, {
    'warm-up subscription write is approved': (response) =>
      response.status === 201 && subscriptionBody?.data?.status === 'active',
  });

  if (!ready || !plans || !authenticated || !subscription) {
    fail('Performance smoke warm-up failed');
  }
}
