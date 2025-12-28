import request from 'supertest';
import { Application } from 'express';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/app';
import {
  User,
  UserStatus,
  Transaction,
  TransactionType,
  ApiKey,
  ApiKeyRole,
} from '../../src/entities';
import { AppDataSource } from '../../src/config/data-source';
import { hashApiKey } from '../../src/middleware/auth';
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from './setup';

describe('Yeet Casino API Integration Tests', () => {
  let app: Application;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let transactionRepository: Repository<Transaction>;
  let apiKeyRepository: Repository<ApiKey>;
  let adminApiKey: string;
  let serviceApiKey: string;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();

    Object.assign(AppDataSource, {
      ...dataSource,
      isInitialized: true,
      getRepository: dataSource.getRepository.bind(dataSource),
      transaction: dataSource.transaction.bind(dataSource),
      query: dataSource.query.bind(dataSource),
    });

    userRepository = dataSource.getRepository(User);
    transactionRepository = dataSource.getRepository(Transaction);
    apiKeyRepository = dataSource.getRepository(ApiKey);

    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();

    adminApiKey = 'test-admin-key-' + Date.now();
    serviceApiKey = 'test-service-key-' + Date.now();

    await apiKeyRepository.save([
      {
        name: 'Test Admin',
        keyHash: hashApiKey(adminApiKey),
        role: ApiKeyRole.ADMIN,
        isActive: true,
      },
      {
        name: 'Test Service',
        keyHash: hashApiKey(serviceApiKey),
        role: ApiKeyRole.SERVICE,
        isActive: true,
      },
    ]);
  });

  describe('Health Check', () => {
    it('GET /api/health should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('API key is required');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app).get('/api/users').set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid API key');
    });

    it('should accept requests with valid admin API key', async () => {
      const response = await request(app).get('/api/users').set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
    });

    it('should accept requests with valid service API key', async () => {
      const response = await request(app).get('/api/users').set('X-API-Key', serviceApiKey);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/users', () => {
    beforeEach(async () => {
      const users: Partial<User>[] = [];
      for (let i = 0; i < 25; i++) {
        users.push({
          username: `testuser${i}`,
          email: `testuser${i}@example.com`,
          balance: (i + 1) * 10000,
          status: UserStatus.ACTIVE,
        });
      }
      await userRepository.save(users);
    });

    it('should return paginated users', async () => {
      const response = await request(app).get('/api/users').set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(20);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      });
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=2&limit=10')
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrevious).toBe(true);
    });

    it('should sort users by balance ascending', async () => {
      const response = await request(app)
        .get('/api/users?sortBy=balance&sortOrder=asc&limit=5')
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      const balances = response.body.data.map((u: { balance: number }) => u.balance);
      expect(balances).toEqual([...balances].sort((a, b) => a - b));
    });

    it('should sort users by balance descending', async () => {
      const response = await request(app)
        .get('/api/users?sortBy=balance&sortOrder=desc&limit=5')
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      const balances = response.body.data.map((u: { balance: number }) => u.balance);
      expect(balances).toEqual([...balances].sort((a, b) => b - a));
    });

    it('should enforce max limit', async () => {
      const response = await request(app).get('/api/users?limit=500').set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('GET /api/users/:id', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        username: 'detailuser',
        email: 'detail@example.com',
        balance: 50000,
        status: UserStatus.ACTIVE,
      });

      await transactionRepository.save([
        {
          userId: testUser.id,
          type: TransactionType.CREDIT,
          amount: 50000,
          balanceAfter: 50000,
          description: 'Initial deposit',
        },
        {
          userId: testUser.id,
          type: TransactionType.DEBIT,
          amount: 10000,
          balanceAfter: 40000,
          description: 'Test debit',
        },
      ]);
    });

    it('should return user details with recent transactions', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}`)
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testUser.id,
        username: 'detailuser',
        balance: 50000,
        status: UserStatus.ACTIVE,
      });
      expect(response.body.data.recentTransactions).toHaveLength(2);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();
      const response = await request(app).get(`/api/users/${fakeId}`).set('X-API-Key', adminApiKey);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-uuid')
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/:id/transactions', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        username: 'txuser',
        email: 'tx@example.com',
        balance: 100000,
        status: UserStatus.ACTIVE,
      });

      const transactions: Partial<Transaction>[] = [];
      for (let i = 0; i < 15; i++) {
        transactions.push({
          userId: testUser.id,
          type: i % 2 === 0 ? TransactionType.CREDIT : TransactionType.DEBIT,
          amount: 5000,
          balanceAfter: 100000 + (i % 2 === 0 ? 5000 : -5000) * (i + 1),
          description: `Transaction ${i}`,
        });
      }
      await transactionRepository.save(transactions);
    });

    it('should return paginated transactions', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.id}/transactions`)
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .get(`/api/users/${fakeId}/transactions`)
        .set('X-API-Key', adminApiKey);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/users/:id/credit', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        username: 'credituser',
        email: 'credit@example.com',
        balance: 10000,
        status: UserStatus.ACTIVE,
      });
    });

    it('should credit user balance', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 5000, description: 'Test credit' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.previousBalance).toBe(10000);
      expect(response.body.newBalance).toBe(15000);
      expect(response.body.transaction.type).toBe(TransactionType.CREDIT);
      expect(response.body.transaction.amount).toBe(5000);

      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      expect(updatedUser?.balance).toBe(15000);
    });

    it('should reject credit with service role', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', serviceApiKey)
        .send({ amount: 5000 });

      expect(response.status).toBe(403);
    });

    it('should validate amount is positive', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: -5000 });

      expect(response.status).toBe(400);
    });

    it('should validate amount is an integer', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 50.5 });

      expect(response.status).toBe(400);
    });

    it('should support idempotency', async () => {
      const idempotencyKey = uuidv4();

      const response1 = await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', adminApiKey)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ amount: 5000 });

      expect(response1.status).toBe(201);

      const response2 = await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', adminApiKey)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ amount: 5000 });

      expect(response2.status).toBe(409);
      expect(response2.body.error.code).toBe('DUPLICATE_TRANSACTION');

      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      expect(updatedUser?.balance).toBe(15000);
    });
  });

  describe('POST /api/users/:id/debit', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        username: 'debituser',
        email: 'debit@example.com',
        balance: 10000,
        status: UserStatus.ACTIVE,
      });
    });

    it('should debit user balance', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/debit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 3000, description: 'Test debit' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.previousBalance).toBe(10000);
      expect(response.body.newBalance).toBe(7000);
      expect(response.body.transaction.type).toBe(TransactionType.DEBIT);

      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      expect(updatedUser?.balance).toBe(7000);
    });

    it('should reject debit exceeding balance', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/debit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 15000 });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Insufficient funds');
    });

    it('should reject debit for non-existent user', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .post(`/api/users/${fakeId}/debit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 5000 });

      expect(response.status).toBe(404);
    });

    it('should support idempotency', async () => {
      const idempotencyKey = uuidv4();

      const response1 = await request(app)
        .post(`/api/users/${testUser.id}/debit`)
        .set('X-API-Key', adminApiKey)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ amount: 3000 });

      expect(response1.status).toBe(201);

      const response2 = await request(app)
        .post(`/api/users/${testUser.id}/debit`)
        .set('X-API-Key', adminApiKey)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ amount: 3000 });

      expect(response2.status).toBe(409);

      const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
      expect(updatedUser?.balance).toBe(7000);
    });
  });

  describe('Transaction Atomicity', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save({
        username: 'atomicuser',
        email: 'atomic@example.com',
        balance: 10000,
        status: UserStatus.ACTIVE,
      });
    });

    it('should create transaction record on credit', async () => {
      await request(app)
        .post(`/api/users/${testUser.id}/credit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 5000 });

      const transactions = await transactionRepository.find({
        where: { userId: testUser.id },
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe(TransactionType.CREDIT);
      expect(transactions[0].amount).toBe(5000);
      expect(transactions[0].balanceAfter).toBe(15000);
    });

    it('should create transaction record on debit', async () => {
      await request(app)
        .post(`/api/users/${testUser.id}/debit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 3000 });

      const transactions = await transactionRepository.find({
        where: { userId: testUser.id },
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe(TransactionType.DEBIT);
      expect(transactions[0].amount).toBe(3000);
      expect(transactions[0].balanceAfter).toBe(7000);
    });

    it('should not create transaction on failed debit', async () => {
      await request(app)
        .post(`/api/users/${testUser.id}/debit`)
        .set('X-API-Key', adminApiKey)
        .send({ amount: 20000 });

      const transactions = await transactionRepository.find({
        where: { userId: testUser.id },
      });

      expect(transactions).toHaveLength(0);

      const user = await userRepository.findOne({ where: { id: testUser.id } });
      expect(user?.balance).toBe(10000);
    });
  });
});
