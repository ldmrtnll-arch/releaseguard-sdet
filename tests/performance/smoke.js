import { prepareUsers } from './helpers/setup.js';
import {
  authenticatedRead,
  login,
  plansRead,
  subscriptionWrite,
} from './scenarios/operations.js';

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    plans_duration: ['p(95)<300'],
    plans_errors: ['rate<0.01'],
    authenticated_read_duration: ['p(95)<300'],
    authenticated_read_errors: ['rate<0.01'],
    login_duration: ['p(95)<400'],
    login_errors: ['rate<0.01'],
    subscription_write_duration: ['p(95)<750'],
    subscription_write_errors: ['rate<0.01'],
  },
  scenarios: {
    'plans-read': {
      executor: 'per-vu-iterations',
      exec: 'runPlansRead',
      vus: 1,
      iterations: 3,
      maxDuration: '15s',
      gracefulStop: '5s',
    },
    'authenticated-read': {
      executor: 'per-vu-iterations',
      exec: 'runAuthenticatedRead',
      vus: 1,
      iterations: 3,
      maxDuration: '15s',
      gracefulStop: '5s',
    },
    login: {
      executor: 'per-vu-iterations',
      exec: 'runLogin',
      vus: 1,
      iterations: 2,
      maxDuration: '15s',
      gracefulStop: '5s',
    },
    'subscription-write': {
      executor: 'shared-iterations',
      exec: 'runSubscriptionWrite',
      vus: 2,
      iterations: 5,
      maxDuration: '20s',
      gracefulStop: '5s',
    },
  },
};

export function setup() {
  return prepareUsers(5);
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
