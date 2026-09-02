import type { QueryExecutor } from '../database.js';
import type { ApprovedPaymentInput, StoredPayment } from './payment.js';

export type PaymentRepository = {
  createApproved: (
    input: ApprovedPaymentInput,
    transaction: QueryExecutor,
  ) => Promise<StoredPayment>;
};

export function createPaymentRepository(): PaymentRepository {
  return {
    async createApproved(input, transaction) {
      const result = await transaction.query<StoredPayment>(
        `INSERT INTO payments (
           id,
           user_id,
           subscription_id,
           provider_payment_id,
           idempotency_key,
           amount_cents,
           currency,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
         RETURNING
           id,
           user_id AS "userId",
           subscription_id AS "subscriptionId",
           provider_payment_id AS "providerPaymentId",
           idempotency_key AS "idempotencyKey",
           amount_cents AS "amountCents",
           currency,
           status,
           created_at AS "createdAt",
           updated_at AS "updatedAt"`,
        [
          input.id,
          input.userId,
          input.subscriptionId,
          input.providerPaymentId,
          input.idempotencyKey,
          input.amountCents,
          input.currency,
        ],
      );
      const payment = result.rows[0];

      if (!payment) throw new Error('Payment insert did not return a row');
      return payment;
    },
  };
}
