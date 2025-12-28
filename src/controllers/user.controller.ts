import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { WalletService } from '../services/wallet.service';
import { parsePaginationParams, parseSortParams } from '../utils';
import { CreditDebitDto } from '../dto';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  private userService: UserService;
  private walletService: WalletService;

  constructor() {
    this.userService = new UserService();
    this.walletService = new WalletService();
  }

  /**
   * GET /api/users
   * Get paginated list of users with sorting
   */
  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = parsePaginationParams(req.query as { page?: string; limit?: string });
      const sort = parseSortParams(req.query as { sortBy?: string; sortOrder?: string });

      const result = await this.userService.getUsers(pagination, sort);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/users/:id
   * Get user details with recent transactions
   */
  getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const transactionLimit = parseInt(req.query.transactionLimit as string, 10) || 10;

      const user = await this.userService.getUserDetails(id, transactionLimit);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/users/:id/transactions
   * Get user's transaction history with pagination
   */
  getUserTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const pagination = parsePaginationParams(req.query as { page?: string; limit?: string });

      const result = await this.userService.getUserTransactions(id, pagination);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users/:id/credit
   * Credit user's balance
   */
  creditUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body as CreditDebitDto;
      const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

      const result = await this.walletService.credit({
        userId: id,
        amount: body.amount,
        description: body.description,
        idempotencyKey,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/users/:id/debit
   * Debit user's balance
   */
  debitUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body as CreditDebitDto;
      const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

      const result = await this.walletService.debit({
        userId: id,
        amount: body.amount,
        description: body.description,
        idempotencyKey,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
