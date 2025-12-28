import { Request, Response, NextFunction } from 'express';
import {
  validate as classValidate,
  ValidationError as ClassValidationError,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validate as uuidValidate } from 'uuid';
import { ValidationError } from '../errors';

type ClassType<T> = new (...args: unknown[]) => T;

export function validateBody<T extends object>(dtoClass: ClassType<T>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.body);
      const errors = await classValidate(dtoInstance);

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        throw new ValidationError('Validation failed', formattedErrors);
      }

      req.body = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function formatValidationErrors(errors: ClassValidationError[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    if (error.constraints) {
      result[error.property] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      const nestedErrors = formatValidationErrors(error.children);
      for (const [key, value] of Object.entries(nestedErrors)) {
        result[`${error.property}.${key}`] = value;
      }
    }
  }

  return result;
}

export function validateUUIDParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const paramValue = req.params[paramName];

      if (!paramValue || !uuidValidate(paramValue)) {
        throw new ValidationError('Validation failed', {
          [paramName]: [`${paramName} must be a valid UUID`],
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
