import { Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yeet Casino API',
      version: '1.0.0',
      description: `
Yeet Casino Backend API for managing user wallets and transactions.

## Authentication

All endpoints (except health check) require authentication via API key.
Include your API key in the \`X-API-Key\` header.

### Roles
- **admin**: Full access to all endpoints including credit/debit operations
- **service**: Read-only access to user and transaction data

## Idempotency

Credit and debit operations support idempotency via the \`X-Idempotency-Key\` header.
If a request with the same idempotency key is received again, the API will return
a 409 Conflict with the original transaction ID.
      `,
      contact: {
        name: 'Yeet Casino Team',
        email: 'support@yeetcasino.example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            balance: { type: 'number' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['credit', 'debit'] },
            amount: { type: 'number' },
            balanceAfter: { type: 'number' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WalletOperationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transaction: { $ref: '#/components/schemas/Transaction' },
            previousBalance: { type: 'number' },
            newBalance: { type: 'number' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrevious: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                errors: {
                  type: 'object',
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Wallet', description: 'Wallet operations (credit/debit)' },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export function setupSwagger(app: Application): void {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Serve swagger spec as JSON
  app.get('/api-docs/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Yeet Casino API Documentation',
    })
  );
}
