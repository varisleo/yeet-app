import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { hashApiKey } from '../../src/middleware/auth';

let container: StartedPostgreSqlContainer;
let testDataSource: DataSource;

export async function setupTestDatabase(): Promise<DataSource> {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('yeet_casino_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = container.getPort().toString();
  process.env.DB_USERNAME = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_DATABASE = container.getDatabase();
  process.env.NODE_ENV = 'test';

  testDataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    synchronize: true,
    logging: false,
    entities: [__dirname + '/../../src/entities/*.ts'],
  });

  await testDataSource.initialize();

  return testDataSource;
}

export async function teardownTestDatabase(): Promise<void> {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
  }
  if (container) {
    await container.stop();
  }
}

export function getTestDataSource(): DataSource {
  return testDataSource;
}

export async function clearDatabase(): Promise<void> {
  const ds = getTestDataSource();
  const entities = ds.entityMetadatas;

  for (const entity of entities) {
    const repository = ds.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }
}

export async function createTestApiKeys(): Promise<{ adminKey: string; serviceKey: string }> {
  const ds = getTestDataSource();
  const apiKeyRepo = ds.getRepository('ApiKey');

  const adminKey = 'test-admin-key-' + Date.now();
  const serviceKey = 'test-service-key-' + Date.now();

  await apiKeyRepo.save([
    {
      name: 'Test Admin',
      keyHash: hashApiKey(adminKey),
      role: 'admin',
      isActive: true,
    },
    {
      name: 'Test Service',
      keyHash: hashApiKey(serviceKey),
      role: 'service',
      isActive: true,
    },
  ]);

  return { adminKey, serviceKey };
}
