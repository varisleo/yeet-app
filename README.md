# Yeet Casino - Backend API & Wallet Service

A robust backend service for managing user wallets and transactions in a casino environment. Built with Node.js, Express, TypeORM, and PostgreSQL.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Design Decisions](#design-decisions)

## Features

- **User Management**: List, search, and view user details with pagination and sorting
- **Wallet Operations**: Credit and debit user balances with full transaction history
- **Transaction Atomicity**: All balance updates are atomic with rollback on failure
- **Idempotency Support**: Prevent duplicate transactions using idempotency keys
- **API Key Authentication**: Role-based access control (admin/service roles)
- **Swagger Documentation**: Interactive API documentation at `/api-docs`
- **Docker Support**: Full containerization with Docker Compose
- **Comprehensive Testing**: Integration and unit tests with Testcontainers

## Technology Stack

- **Runtime**: Node.js 20 with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **ORM**: TypeORM
- **Testing**: Jest, Supertest, Testcontainers
- **Documentation**: Swagger/OpenAPI 3.0
- **Containerization**: Docker & Docker Compose

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│              users                   │
├─────────────────────────────────────┤
│ id          UUID PK                  │
│ username    VARCHAR(50) UNIQUE       │
│ email       VARCHAR(100)             │
│ balance     BIGINT (cents)           │
│ status      ENUM (active/inactive/   │
│             suspended)               │
│ version     INTEGER                  │
│ created_at  TIMESTAMP                │
│ updated_at  TIMESTAMP                │
└─────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────┐
│          transactions                │
├─────────────────────────────────────┤
│ id              UUID PK              │
│ user_id         UUID FK              │
│ type            ENUM (credit/debit)  │
│ amount          BIGINT (cents)       │
│ balance_after   BIGINT (cents)       │
│ idempotency_key VARCHAR(255) UNIQUE  │
│ description     VARCHAR(500)         │
│ created_at      TIMESTAMP            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│            api_keys                  │
├─────────────────────────────────────┤
│ id          UUID PK                  │
│ key_hash    VARCHAR(255) UNIQUE      │
│ name        VARCHAR(100)             │
│ role        ENUM (admin/service)     │
│ is_active   BOOLEAN                  │
│ created_at  TIMESTAMP                │
└─────────────────────────────────────┘
```

### Schema Design Rationale

1. **Balance as BIGINT (cents)**: Stores monetary values as integers representing cents, completely eliminating floating-point precision issues. For example, $10.50 is stored as 1050 cents.
2. **balance_after Column**: Each transaction records the resulting balance for audit trail and reconciliation
3. **Pessimistic Locking**: Uses database row-level locks during transactions to prevent race conditions
4. **idempotency_key**: Unique nullable column allows optional idempotency without requiring it for every request
5. **Indexes**: Strategic indexes on frequently queried columns (username, balance, created_at, user_id)

## API Endpoints

### Health Check

| Method | Endpoint      | Description                   |
| ------ | ------------- | ----------------------------- |
| GET    | `/api/health` | Check API and database health |

### User Management

| Method | Endpoint                      | Description            | Auth          |
| ------ | ----------------------------- | ---------------------- | ------------- |
| GET    | `/api/users`                  | List users (paginated) | Service/Admin |
| GET    | `/api/users/:id`              | Get user details       | Service/Admin |
| GET    | `/api/users/:id/transactions` | Get user transactions  | Service/Admin |

### Wallet Operations

| Method | Endpoint                | Description         | Auth       |
| ------ | ----------------------- | ------------------- | ---------- |
| POST   | `/api/users/:id/credit` | Credit user balance | Admin only |
| POST   | `/api/users/:id/debit`  | Debit user balance  | Admin only |

### Request/Response Examples

#### List Users

```bash
curl -X GET "http://localhost:3000/api/users?page=1&limit=10&sortBy=balance&sortOrder=desc" \
  -H "X-API-Key: admin-secret-key"
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "highroller",
      "balance": 10000.0,
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### Credit User Balance

```bash
curl -X POST "http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000/credit" \
  -H "X-API-Key: admin-secret-key" \
  -H "X-Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00, "description": "Bonus credit"}'
```

Response:

```json
{
  "success": true,
  "transaction": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "credit",
    "amount": 100.0,
    "balanceAfter": 10100.0,
    "description": "Bonus credit",
    "createdAt": "2024-01-15T11:00:00.000Z"
  },
  "previousBalance": 10000.0,
  "newBalance": 10100.0
}
```

#### Error Response (Insufficient Funds)

```json
{
  "success": false,
  "error": {
    "message": "Insufficient funds. Current balance: 50.00, Requested amount: 100.00"
  }
}
```

## Authentication

The API uses API key authentication. Include your API key in the `X-API-Key` header.

### Roles

- **admin**: Full access to all endpoints including credit/debit operations
- **service**: Read-only access to user and transaction data

### Default API Keys (Development)

After running the seed script:

- Admin: `admin-secret-key`
- Service: `service-secret-key`

**Important**: Change these keys in production by setting environment variables.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Quick Start with Docker

1. Clone the repository:

```bash
git clone https://github.com/LeoVaris/test-app.git
cd test-app
```

2. Start the application:

```bash
docker compose up --build
```

Notice: for some reason I was not able to verify this myself, since I ran into npm networking errors. The development startup works normally.

3. The API will be available at `http://localhost:3000`

4. Seed the database (in a new terminal):

```bash
docker compose exec api npm run seed
```

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL (using Docker):

```bash
docker compose up postgres -d
```

3. Create a `.env` file:

```bash
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=yeet_casino
ADMIN_API_KEY=admin-secret-key
SERVICE_API_KEY=service-secret-key
```

4. Run the development server:

```bash
npm run dev
```

5. Seed the database:

```bash
npm run seed
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Testing Strategy

- **Integration Tests**: Test complete API flows using Testcontainers with real PostgreSQL
- **Unit Tests**: Test utility functions and error classes in isolation
- **Test Coverage Target**: 80%+

Tests cover:

- Authentication and authorization
- User listing with pagination and sorting
- Credit/debit operations
- Idempotency handling
- Error cases (insufficient funds, user not found, validation errors)
- Transaction atomicity

## API Documentation

Interactive Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

OpenAPI specification can be downloaded at:

```
http://localhost:3000/api-docs/swagger.json
```

## Configuration

### Environment Variables

| Variable        | Default            | Description                               |
| --------------- | ------------------ | ----------------------------------------- |
| NODE_ENV        | development        | Environment (development/production/test) |
| PORT            | 3000               | API server port                           |
| DB_HOST         | localhost          | PostgreSQL host                           |
| DB_PORT         | 5432               | PostgreSQL port                           |
| DB_USERNAME     | postgres           | Database username                         |
| DB_PASSWORD     | postgres           | Database password                         |
| DB_DATABASE     | yeet_casino        | Database name                             |
| ADMIN_API_KEY   | admin-secret-key   | Admin API key (change in production!)     |
| SERVICE_API_KEY | service-secret-key | Service API key (change in production!)   |

## Design Decisions

### Transaction Atomicity

All wallet operations use PostgreSQL transactions with pessimistic locking:

1. Lock the user row for update
2. Validate the operation (e.g., sufficient funds for debit)
3. Update the balance
4. Create the transaction record
5. Commit or rollback on any failure

### Idempotency

The `X-Idempotency-Key` header allows clients to safely retry requests:

- If a request with the same key was already processed, returns 409 Conflict
- The original transaction ID is included in the error response
- Idempotency keys are optional but recommended for production use

### Optimistic Locking

The User entity includes a version column for optimistic locking:

- Prevents lost updates from concurrent modifications
- Returns 409 Conflict if version mismatch occurs
- Clients should retry the operation

### Balance Precision

- Stored as DECIMAL(18,2) for precision
- Supports values up to 9,999,999,999,999,999.99
- Transformation layer converts to/from JavaScript numbers

## Project Structure

```
yeet/
├── src/
│   ├── config/         # Database and app configuration
│   ├── controllers/    # Request handlers
│   ├── dto/            # Data transfer objects
│   ├── entities/       # TypeORM entities
│   ├── errors/         # Custom error classes
│   ├── middleware/     # Auth, validation, error handling
│   ├── routes/         # Express route definitions
│   ├── services/       # Business logic layer
│   ├── utils/          # Helpers (pagination, sorting)
│   ├── app.ts          # Express app setup
│   ├── index.ts        # Application entry point
│   └── swagger.ts      # Swagger configuration
├── tests/
│   ├── integration/    # API integration tests
│   └── unit/           # Unit tests
├── scripts/
│   └── seed.ts         # Database seeding script
├── .github/
│   └── workflows/
│       └── ci.yml      # GitHub Actions CI pipeline
├── docker compose.yml
├── Dockerfile
└── package.json
```

## Bonus Features Implemented

1. **CI Integration**: GitHub Actions workflow for linting, testing, and building
2. **OpenAPI/Swagger**: Full API documentation with interactive UI
3. **Idempotent Transactions**: Support via `X-Idempotency-Key` header
4. **Basic Authentication**: API key authentication with role-based access control
