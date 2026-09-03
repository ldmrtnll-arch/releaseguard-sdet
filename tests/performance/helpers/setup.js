import { check, fail } from 'k6';

import { performanceConfig } from '../config.js';
import { json, post } from './http.js';

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
