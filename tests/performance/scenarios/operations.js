import { check, sleep } from 'k6';
import exec from 'k6/execution';

import { performanceConfig } from '../config.js';
import { get, json, post } from '../helpers/http.js';
import {
  authenticatedReadDuration,
  authenticatedReadErrors,
  authenticatedReadRequests,
  loginDuration,
  loginErrors,
  loginRequests,
  plansDuration,
  plansErrors,
  plansRequests,
  record,
  subscriptionWriteDuration,
  subscriptionWriteErrors,
  subscriptionWriteRequests,
} from '../helpers/metrics.js';

function userForVu(data) {
  return data.users[(__VU - 1) % data.users.length];
}

export function plansRead(pauseSeconds = 0) {
  const response = get('/api/v1/plans', { operation: 'plans-read' });
  const body = json(response);
  const success = check(response, {
    'plans returns three plans': () =>
      response.status === 200 && body?.data?.length === 3,
  });
  record(
    response,
    { duration: plansDuration, errors: plansErrors, requests: plansRequests },
    success,
  );
  if (pauseSeconds) sleep(pauseSeconds);
}

export function authenticatedRead(data, pauseSeconds = 0) {
  const response = get('/api/v1/auth/me', {
    operation: 'authenticated-read',
    token: userForVu(data).token,
  });
  const body = json(response);
  const success = check(response, {
    'authenticated read returns current user': () =>
      response.status === 200 && typeof body?.user?.id === 'string',
  });
  record(
    response,
    {
      duration: authenticatedReadDuration,
      errors: authenticatedReadErrors,
      requests: authenticatedReadRequests,
    },
    success,
  );
  if (pauseSeconds) sleep(pauseSeconds);
}

export function login(data, pauseSeconds = 0) {
  const user = userForVu(data);
  const response = post(
    '/api/v1/auth/login',
    { email: user.email, password: performanceConfig.password },
    { operation: 'login' },
  );
  const body = json(response);
  const success = check(response, {
    'login returns an access token': () =>
      response.status === 200 && typeof body?.accessToken === 'string',
  });
  record(
    response,
    { duration: loginDuration, errors: loginErrors, requests: loginRequests },
    success,
  );
  if (pauseSeconds) sleep(pauseSeconds);
}

export function subscriptionWrite(data) {
  const index = Number(exec.scenario.iterationInTest);
  const user = data.users[index];
  const response = post(
    '/api/v1/subscriptions',
    { planId: performanceConfig.starterPlanId },
    {
      idempotencyKey: `perf-${performanceConfig.runId}-${index}`,
      operation: 'subscription-write',
      token: user.token,
    },
  );
  const body = json(response);
  const success = check(response, {
    'subscription write is approved': () =>
      response.status === 201 && body?.data?.status === 'active',
  });
  record(
    response,
    {
      duration: subscriptionWriteDuration,
      errors: subscriptionWriteErrors,
      requests: subscriptionWriteRequests,
    },
    success,
  );
}
