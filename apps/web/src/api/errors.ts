import { ApiError } from './client';

const messages: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  NETWORK_ERROR: 'ReleaseGuard is temporarily unavailable.',
  PAYMENT_DECLINED:
    'Your payment was declined. Please try another payment method.',
  PAYMENT_PROVIDER_TIMEOUT:
    'Payment authorization timed out. Please try again.',
  PAYMENT_PROVIDER_UNAVAILABLE:
    'Payment authorization is temporarily unavailable. Please try again.',
  SUBSCRIPTION_ALREADY_ACTIVE: 'You already have an active subscription.',
  SUBSCRIPTION_ALREADY_ON_PLAN: 'This is already your current plan.',
  UNAUTHORIZED: 'Your session is no longer valid. Please sign in again.',
  VALIDATION_ERROR: 'Please review the information and try again.',
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.code] ?? 'We could not complete your request.';
  }

  return 'We could not complete your request.';
}
