import { Counter, Rate, Trend } from 'k6/metrics';

export const plansDuration = new Trend('plans_duration', true);
export const plansErrors = new Rate('plans_errors');
export const plansRequests = new Counter('plans_requests');

export const authenticatedReadDuration = new Trend(
  'authenticated_read_duration',
  true,
);
export const authenticatedReadErrors = new Rate('authenticated_read_errors');
export const authenticatedReadRequests = new Counter(
  'authenticated_read_requests',
);

export const loginDuration = new Trend('login_duration', true);
export const loginErrors = new Rate('login_errors');
export const loginRequests = new Counter('login_requests');

export const subscriptionWriteDuration = new Trend(
  'subscription_write_duration',
  true,
);
export const subscriptionWriteErrors = new Rate('subscription_write_errors');
export const subscriptionWriteRequests = new Counter(
  'subscription_write_requests',
);

export function record(response, { duration, errors, requests }, success) {
  duration.add(response.timings.duration);
  errors.add(!success);
  requests.add(1);
}
