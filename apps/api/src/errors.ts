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
