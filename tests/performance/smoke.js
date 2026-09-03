import { prepareUsers, warmUpSmoke } from './helpers/setup.js';
import {
  authenticatedRead,
  login,
  plansRead,
  subscriptionWrite,
} from './scenarios/operations.js';

function threshold(name, localDefault) {
  const configured = __ENV[name];
  if (configured === undefined) return localDefault;

  const value = Number(configured);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

const loginP95 = threshold('PERF_SMOKE_LOGIN_P95_MS', 400);
const subscriptionWriteP95 = threshold(
  'PERF_SMOKE_SUBSCRIPTION_WRITE_P95_MS',
  750,
);

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    plans_duration: ['p(95)<300'],
    plans_errors: ['rate<0.01'],
    authenticated_read_duration: ['p(95)<300'],
    authenticated_read_errors: ['rate<0.01'],
    login_duration: [`p(95)<${loginP95}`],
    login_errors: ['rate<0.01'],
    subscription_write_duration: [`p(95)<${subscriptionWriteP95}`],
    subscription_write_errors: ['rate<0.01'],
  },
  scenarios: {
    'plans-read': {
      executor: 'per-vu-iterations',
      exec: 'runPlansRead',
      vus: 1,
      iterations: 12,
      maxDuration: '15s',
      gracefulStop: '5s',
    },
    'authenticated-read': {
      executor: 'per-vu-iterations',
      exec: 'runAuthenticatedRead',
      vus: 1,
      iterations: 12,
      startTime: '3s',
      maxDuration: '15s',
      gracefulStop: '5s',
    },
    login: {
      executor: 'per-vu-iterations',
      exec: 'runLogin',
      vus: 1,
      iterations: 4,
      startTime: '6s',
      maxDuration: '15s',
      gracefulStop: '5s',
    },
    'subscription-write': {
      executor: 'shared-iterations',
      exec: 'runSubscriptionWrite',
      vus: 2,
      iterations: 5,
      startTime: '9s',
      maxDuration: '20s',
      gracefulStop: '5s',
    },
  },
};

export function setup() {
  const data = prepareUsers(6);
  warmUpSmoke(data);
  return data;
}

export function runPlansRead() {
  plansRead();
}

export function runAuthenticatedRead(data) {
  authenticatedRead(data);
}

export function runLogin(data) {
  login(data);
}

export function runSubscriptionWrite(data) {
  subscriptionWrite(data);
}
