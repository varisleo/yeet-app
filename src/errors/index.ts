export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(userId?: string) {
    super(userId ? `User with ID ${userId} not found` : 'User not found');
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

export class ValidationError extends BadRequestError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message);
    this.errors = errors;
  }
}

export class InsufficientFundsError extends BadRequestError {
  constructor(currentBalance: number, requestedAmount: number) {
    const balanceDollars = (currentBalance / 100).toFixed(2);
    const amountDollars = (requestedAmount / 100).toFixed(2);
    super(
      `Insufficient funds. Current balance: $${balanceDollars} (${currentBalance} cents), ` +
        `Requested amount: $${amountDollars} (${requestedAmount} cents)`
    );
  }
}

export class DuplicateTransactionError extends AppError {
  public readonly existingTransactionId: string;

  constructor(idempotencyKey: string, existingTransactionId: string) {
    super(`Transaction with idempotency key '${idempotencyKey}' already processed`, 409);
    this.existingTransactionId = existingTransactionId;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class OptimisticLockError extends ConflictError {
  constructor() {
    super('The resource was modified by another request. Please retry.');
  }
}
