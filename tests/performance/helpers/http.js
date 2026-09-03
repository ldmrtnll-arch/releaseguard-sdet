import http from 'k6/http';

import { performanceConfig } from '../config.js';

const jsonHeaders = { 'content-type': 'application/json' };

export function get(path, { operation, token } = {}) {
  return http.get(`${performanceConfig.apiBaseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    tags: { name: `GET ${path}`, operation },
  });
}

export function post(path, body, { idempotencyKey, operation, token } = {}) {
  return http.post(
    `${performanceConfig.apiBaseUrl}${path}`,
    JSON.stringify(body),
    {
      headers: {
        ...jsonHeaders,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
      tags: { name: `POST ${path}`, operation },
    },
  );
}

export function json(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}
