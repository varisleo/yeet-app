import { Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';

export class HealthController {
  /**
   * GET /api/health
   * Check API and database health
   */
  check = async (_req: Request, res: Response): Promise<void> => {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'unknown' as 'ok' | 'error' | 'unknown',
    };

    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.query('SELECT 1');
        healthStatus.database = 'ok';
      } else {
        healthStatus.database = 'error';
        healthStatus.status = 'degraded';
      }
    } catch {
      healthStatus.database = 'error';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  };
}

export const healthController = new HealthController();
