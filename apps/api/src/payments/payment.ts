export type StoredPayment = {
  amountCents: number;
  createdAt: Date;
  currency: 'USD';
  id: string;
  idempotencyKey: string;
  providerPaymentId: string;
  status: 'approved';
  subscriptionId: string;
  updatedAt: Date;
  userId: string;
};

export type ApprovedPaymentInput = {
  amountCents: number;
  currency: 'USD';
  id: string;
  idempotencyKey: string;
  providerPaymentId: string;
  subscriptionId: string;
  userId: string;
};
