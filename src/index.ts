import 'reflect-metadata';
import { createApp } from './app';
import { AppDataSource } from './config/data-source';
import { config } from './config';

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully');

    const app = createApp();

    app.listen(config.port, () => {
      console.log(`Yeet Casino API is running on port ${config.port}`);
      console.log(`Swagger documentation available at http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    console.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
