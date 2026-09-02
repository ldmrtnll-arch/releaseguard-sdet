import Fastify from 'fastify';
import { z } from 'zod';

import {
  authorizationInputSchema,
  paymentScenarios,
  PaymentStateStore,
  type AuthorizationInput,
  type PaymentResult,
  type PaymentScenario,
  type PaymentState,
} from './payment.js';

type BuildProviderOptions = {
  slowDelayMs?: number;
  store?: PaymentStateStore;
  timeoutDelayMs?: number;
};

const idempotencyKeySchema = z.string().min(8).max(128);
const scenarioSchema = z.enum(paymentScenarios).default('approved');

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function error(code: string, message: string) {
  return { error: { code, message } };
}

async function delayedResult(
  store: PaymentStateStore,
  state: PaymentState,
  input: AuthorizationInput,
  milliseconds: number,
): Promise<PaymentResult> {
  await delay(milliseconds);
  return store.complete(state, input, 'approved');
}

export function buildProvider({
  slowDelayMs = 100,
  store = new PaymentStateStore(),
  timeoutDelayMs = 650,
}: BuildProviderOptions = {}) {
  const app = Fastify({
    logger: {
      redact: ['req.headers.authorization'],
    },
    requestIdHeader: 'x-request-id',
  });

  app.get('/health', () => ({ status: 'ok' }));

  app.post('/payments/authorize', async (request, reply) => {
    const inputResult = authorizationInputSchema.safeParse(request.body);
    const keyResult = idempotencyKeySchema.safeParse(
      request.headers['idempotency-key'],
    );
    const scenarioResult = scenarioSchema.safeParse(
      request.headers['x-test-payment-scenario'],
    );

    if (!inputResult.success || !keyResult.success || !scenarioResult.success) {
      return reply
        .code(400)
        .send(error('VALIDATION_ERROR', 'Payment request is invalid'));
    }

    const scenario: PaymentScenario = scenarioResult.data;
    const { conflict, state } = store.begin(
      keyResult.data,
      inputResult.data,
      request.id,
      scenario,
    );

    request.log.info(
      { idempotencyKey: keyResult.data, scenario },
      'Payment authorization attempt',
    );

    if (conflict) {
      return reply
        .code(409)
        .send(
          error(
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was already used with a different payload',
          ),
        );
    }

    if (state.result) return state.result;
    if (state.operation) return state.operation;

    if (state.scenario === 'server-error') {
      return reply
        .code(500)
        .send(error('PROVIDER_INTERNAL_ERROR', 'Injected provider failure'));
    }

    if (state.scenario === 'transient-error' && state.attempts === 1) {
      return reply
        .code(500)
        .send(error('PROVIDER_TRANSIENT_ERROR', 'Injected transient failure'));
    }

    if (state.scenario === 'declined') {
      return store.complete(state, inputResult.data, 'declined');
    }

    const delayMs =
      state.scenario === 'timeout'
        ? timeoutDelayMs
        : state.scenario === 'slow'
          ? slowDelayMs
          : 0;

    if (delayMs === 0) {
      return store.complete(state, inputResult.data, 'approved');
    }

    state.operation = delayedResult(store, state, inputResult.data, delayMs);
    return state.operation;
  });

  app.get('/__test/state/:idempotencyKey', async (request, reply) => {
    const parameters = z
      .object({ idempotencyKey: z.string().min(1) })
      .safeParse(request.params);

    if (!parameters.success) {
      return reply.code(400).send(error('VALIDATION_ERROR', 'Key is invalid'));
    }

    const state = store.find(parameters.data.idempotencyKey);

    if (!state) {
      return reply
        .code(404)
        .send(error('PAYMENT_STATE_NOT_FOUND', 'Payment state was not found'));
    }

    return {
      attempts: state.attempts,
      idempotencyKey: state.idempotencyKey,
      logicalPayments: state.result ? 1 : 0,
      paymentId: state.result?.paymentId ?? null,
      requestIds: state.requestIds,
      scenario: state.scenario,
      status: state.result?.status ?? null,
    };
  });

  return app;
}
