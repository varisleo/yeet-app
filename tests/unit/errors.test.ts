import {
  AppError,
  NotFoundError,
  UserNotFoundError,
  BadRequestError,
  ValidationError,
  InsufficientFundsError,
  DuplicateTransactionError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  OptimisticLockError,
} from '../../src/errors';

describe('Custom Errors', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow setting isOperational to false', () => {
      const error = new AppError('Test error', 500, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status code', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('Custom not found');

      expect(error.message).toBe('Custom not found');
    });
  });

  describe('UserNotFoundError', () => {
    it('should include user ID in message', () => {
      const error = new UserNotFoundError('123-456');

      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('123-456');
    });

    it('should have generic message when no ID provided', () => {
      const error = new UserNotFoundError();

      expect(error.message).toBe('User not found');
    });
  });

  describe('BadRequestError', () => {
    it('should have 400 status code', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
    });
  });

  describe('ValidationError', () => {
    it('should have 400 status code and validation errors', () => {
      const errors = {
        field1: ['error1', 'error2'],
        field2: ['error3'],
      };
      const error = new ValidationError('Validation failed', errors);

      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual(errors);
    });

    it('should default to empty errors object', () => {
      const error = new ValidationError();

      expect(error.errors).toEqual({});
    });
  });

  describe('InsufficientFundsError', () => {
    it('should include balance and amount in message', () => {
      const error = new InsufficientFundsError(5050, 10000);

      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('$50.50');
      expect(error.message).toContain('5050 cents');
      expect(error.message).toContain('$100.00');
      expect(error.message).toContain('10000 cents');
    });
  });

  describe('DuplicateTransactionError', () => {
    it('should have 409 status code and include transaction ID', () => {
      const error = new DuplicateTransactionError('key-123', 'tx-456');

      expect(error.statusCode).toBe(409);
      expect(error.existingTransactionId).toBe('tx-456');
      expect(error.message).toContain('key-123');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have 401 status code', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should have 403 status code', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('ConflictError', () => {
    it('should have 409 status code', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
    });
  });

  describe('OptimisticLockError', () => {
    it('should have 409 status code with retry message', () => {
      const error = new OptimisticLockError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('retry');
    });
  });
});
