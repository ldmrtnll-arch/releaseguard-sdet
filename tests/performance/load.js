import { prepareUsers } from './helpers/setup.js';
import { authenticatedRead, login, plansRead } from './scenarios/operations.js';

const stages = [
  { duration: '10s', target: 1 },
  { duration: '30s', target: 1 },
  { duration: '10s', target: 0 },
];

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    plans_duration: ['p(95)<150'],
    plans_errors: ['rate<0.01'],
    authenticated_read_duration: ['p(95)<150'],
    authenticated_read_errors: ['rate<0.01'],
    login_duration: ['p(95)<300'],
    login_errors: ['rate<0.01'],
  },
  scenarios: {
    'plans-read': {
      executor: 'ramping-vus',
      exec: 'runPlansRead',
      gracefulRampDown: '5s',
      gracefulStop: '5s',
      stages: stages.map((stage) => ({ ...stage, target: stage.target * 6 })),
    },
    'authenticated-read': {
      executor: 'ramping-vus',
      exec: 'runAuthenticatedRead',
      gracefulRampDown: '5s',
      gracefulStop: '5s',
      stages: stages.map((stage) => ({ ...stage, target: stage.target * 4 })),
    },
    login: {
      executor: 'ramping-vus',
      exec: 'runLogin',
      gracefulRampDown: '5s',
      gracefulStop: '5s',
      stages: stages.map((stage) => ({ ...stage, target: stage.target * 2 })),
    },
  },
};

export function setup() {
  return prepareUsers(12);
}

export function runPlansRead() {
  plansRead(0.2);
}

export function runAuthenticatedRead(data) {
  authenticatedRead(data, 0.3);
}

export function runLogin(data) {
  login(data, 0.5);
}
