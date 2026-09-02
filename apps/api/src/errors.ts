export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class EmailAlreadyRegisteredError extends AppError {
  constructor() {
    super(
      'EMAIL_ALREADY_REGISTERED',
      'An account with this email already exists',
      409,
    );
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('UNAUTHORIZED', 'Authentication is required', 401);
  }
}

export class PlanNotFoundError extends AppError {
  constructor() {
    super('PLAN_NOT_FOUND', 'The requested plan was not found', 404);
  }
}

export class SubscriptionNotFoundError extends AppError {
  constructor() {
    super('SUBSCRIPTION_NOT_FOUND', 'No active subscription was found', 404);
  }
}

export class SubscriptionAlreadyActiveError extends AppError {
  constructor() {
    super(
      'SUBSCRIPTION_ALREADY_ACTIVE',
      'The user already has an active subscription',
      409,
    );
  }
}

export class SubscriptionAlreadyOnPlanError extends AppError {
  constructor() {
    super(
      'SUBSCRIPTION_ALREADY_ON_PLAN',
      'The subscription is already on the requested plan',
      409,
    );
  }
}

export class PaymentDeclinedError extends AppError {
  constructor() {
    super('PAYMENT_DECLINED', 'The payment was declined', 402);
  }
}

export class PaymentProviderUnavailableAppError extends AppError {
  constructor() {
    super(
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'The payment provider is temporarily unavailable',
      503,
    );
  }
}

export class PaymentProviderTimeoutAppError extends AppError {
  constructor() {
    super('PAYMENT_PROVIDER_TIMEOUT', 'The payment provider timed out', 504);
  }
}
