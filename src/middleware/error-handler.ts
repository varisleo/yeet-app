import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, DuplicateTransactionError } from '../errors';
import { config } from '../config';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
    existingTransactionId?: string;
  };
  stack?: string;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err);

  const response: ErrorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
    },
  };

  let statusCode = 500;

  if (err instanceof AppError) {
    statusCode = err.statusCode;

    if (err instanceof ValidationError) {
      response.error.code = 'VALIDATION_ERROR';
      response.error.errors = err.errors;
    }

    if (err instanceof DuplicateTransactionError) {
      response.error.code = 'DUPLICATE_TRANSACTION';
      response.error.existingTransactionId = err.existingTransactionId;
    }
  } else if (err.name === 'QueryFailedError') {
    statusCode = 400;
    response.error.message = 'Database operation failed';
    response.error.code = 'DATABASE_ERROR';
  }

  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
