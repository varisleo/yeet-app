import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../config/data-source';
import { ApiKey, ApiKeyRole } from '../entities';
import { UnauthorizedError, ForbiddenError } from '../errors';

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKeyHeader = req.headers['x-api-key'];

    if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
      throw new UnauthorizedError('API key is required');
    }

    const apiKeyRepository = AppDataSource.getRepository(ApiKey);

    const keyHash = hashApiKey(apiKeyHeader);
    const matchedKey = await apiKeyRepository.findOne({
      where: { keyHash, isActive: true },
    });

    if (!matchedKey) {
      throw new UnauthorizedError('Invalid API key');
    }

    req.apiKey = matchedKey;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles: ApiKeyRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.apiKey) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(req.apiKey.role)) {
        throw new ForbiddenError(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAdmin = requireRole(ApiKeyRole.ADMIN);

export const requireServiceOrAdmin = requireRole(ApiKeyRole.ADMIN, ApiKeyRole.SERVICE);
