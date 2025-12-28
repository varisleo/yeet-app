import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User, Transaction, TransactionType } from '../entities';
import { UserNotFoundError, InsufficientFundsError, DuplicateTransactionError } from '../errors';
import { WalletOperationResponseDto, TransactionResponseDto } from '../dto';

export interface WalletOperationParams {
  userId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export class WalletService {
  async credit(params: WalletOperationParams): Promise<WalletOperationResponseDto> {
    return this.executeWalletOperation(params, TransactionType.CREDIT);
  }

  async debit(params: WalletOperationParams): Promise<WalletOperationResponseDto> {
    return this.executeWalletOperation(params, TransactionType.DEBIT);
  }

  private async executeWalletOperation(
    params: WalletOperationParams,
    type: TransactionType
  ): Promise<WalletOperationResponseDto> {
    const { userId, amount, description, idempotencyKey } = params;

    return AppDataSource.transaction(async (entityManager: EntityManager) => {
      const userRepo = entityManager.getRepository(User);
      const transactionRepo = entityManager.getRepository(Transaction);

      if (idempotencyKey) {
        const existingTransaction = await transactionRepo.findOne({
          where: { idempotencyKey },
        });

        if (existingTransaction) {
          throw new DuplicateTransactionError(idempotencyKey, existingTransaction.id);
        }
      }

      const user = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      const previousBalance = user.balance;
      let newBalance: number;

      if (type === TransactionType.CREDIT) {
        newBalance = previousBalance + amount;
      } else {
        if (previousBalance < amount) {
          throw new InsufficientFundsError(previousBalance, amount);
        }
        newBalance = previousBalance - amount;
      }

      user.balance = newBalance;
      await userRepo.save(user);

      const transaction = transactionRepo.create({
        userId,
        type,
        amount,
        balanceAfter: newBalance,
        idempotencyKey: idempotencyKey || null,
        description: description || null,
      });

      await transactionRepo.save(transaction);

      const transactionResponse: TransactionResponseDto = {
        id: transaction.id,
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        description: transaction.description,
        createdAt: transaction.createdAt,
      };

      return {
        success: true,
        transaction: transactionResponse,
        previousBalance,
        newBalance,
      };
    });
  }
}

export const walletService = new WalletService();
