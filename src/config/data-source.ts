import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from './index';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.nodeEnv === 'development',
  logging: config.nodeEnv === 'development',
  entities: [__dirname + '/../entities/*.{js,ts}'],
  migrations: [__dirname + '/../migrations/*.{js,ts}'],
  subscribers: [],
};

export const AppDataSource = new DataSource(dataSourceOptions);
