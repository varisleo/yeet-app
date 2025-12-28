import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { setupSwagger } from './swagger';
import { errorHandler } from './middleware/error-handler';
import { userRoutes } from './routes/user.routes';
import { healthRoutes } from './routes/health.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  setupSwagger(app);

  app.use('/api', healthRoutes);
  app.use('/api/users', userRoutes);

  app.use(errorHandler);

  return app;
}
