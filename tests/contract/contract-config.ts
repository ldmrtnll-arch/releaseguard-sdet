import path from 'node:path';

export const contractConsumer = 'ReleaseGuard API';
export const contractProvider = 'ReleaseGuard Payment Provider';
export const pactDirectory = path.resolve(process.cwd(), 'pacts');
export const pactFile = path.join(
  pactDirectory,
  'ReleaseGuard API-ReleaseGuard Payment Provider.json',
);

const sharedRequest = {
  amountCents: 2900,
  currency: 'USD' as const,
  customerReference: '7b763447-42c9-48ff-9b98-a89a19de1f01',
};

export const contractRequests = {
  approved: {
    ...sharedRequest,
    idempotencyKey: 'contract.payment.approved.v1',
    requestId: 'ab01a5ae-0908-4cc2-bd08-30f9aeea4c52',
  },
  declined: {
    ...sharedRequest,
    idempotencyKey: 'contract.payment.declined.v1',
    requestId: '65aa4a5a-8b35-4748-9a86-70dd24076a5d',
  },
  serverError: {
    ...sharedRequest,
    idempotencyKey: 'contract.payment.server-error.v1',
    requestId: '0b7645f7-620f-449b-8b5d-9a87a7de67dc',
  },
};
