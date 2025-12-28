import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, requireAdmin, requireServiceOrAdmin } from '../middleware/auth';
import { validateBody, validateUUIDParam } from '../middleware/validate';
import { CreditDebitDto } from '../dto';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get list of users
 *     description: Retrieve a paginated list of users with optional sorting
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [username, balance, createdAt, status]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 */
router.get('/', authenticate, requireServiceOrAdmin, userController.getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user details
 *     description: Retrieve user details including recent transactions
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: transactionLimit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent transactions to include
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authenticate,
  requireServiceOrAdmin,
  validateUUIDParam('id'),
  userController.getUserById
);

/**
 * @swagger
 * /api/users/{id}/transactions:
 *   get:
 *     summary: Get user's transaction history
 *     description: Retrieve paginated transaction history for a user
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated transaction history
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/:id/transactions',
  authenticate,
  requireServiceOrAdmin,
  validateUUIDParam('id'),
  userController.getUserTransactions
);

/**
 * @swagger
 * /api/users/{id}/credit:
 *   post:
 *     summary: Credit user's balance
 *     description: Add funds to a user's account. Requires admin role.
 *     tags: [Wallet]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         description: Optional unique key to prevent duplicate transactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Amount to credit in cents (1 = $0.01)
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Credit successful
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       409:
 *         description: Duplicate transaction (idempotency key already used)
 */
router.post(
  '/:id/credit',
  authenticate,
  requireAdmin,
  validateUUIDParam('id'),
  validateBody(CreditDebitDto),
  userController.creditUser
);

/**
 * @swagger
 * /api/users/{id}/debit:
 *   post:
 *     summary: Debit user's balance
 *     description: Withdraw funds from a user's account. Requires admin role.
 *     tags: [Wallet]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: header
 *         name: X-Idempotency-Key
 *         schema:
 *           type: string
 *         description: Optional unique key to prevent duplicate transactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Amount to debit in cents (1 = $0.01)
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Debit successful
 *       400:
 *         description: Invalid request or insufficient funds
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       409:
 *         description: Duplicate transaction (idempotency key already used)
 */
router.post(
  '/:id/debit',
  authenticate,
  requireAdmin,
  validateUUIDParam('id'),
  validateBody(CreditDebitDto),
  userController.debitUser
);

export { router as userRoutes };
