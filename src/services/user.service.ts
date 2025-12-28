import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User, Transaction } from '../entities';
import { UserNotFoundError } from '../errors';
import { PaginationParams, SortParams, createPaginatedResponse, PaginatedResponse } from '../utils';
import { UserResponseDto, UserDetailResponseDto, UserListItemDto } from '../dto';

export class UserService {
  private userRepository: Repository<User>;
  private transactionRepository: Repository<Transaction>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  async getUsers(
    pagination: PaginationParams,
    sort: SortParams
  ): Promise<PaginatedResponse<UserListItemDto>> {
    const [users, total] = await this.userRepository.findAndCount({
      select: ['id', 'username', 'balance', 'status', 'createdAt'],
      order: { [sort.sortBy]: sort.sortOrder },
      skip: pagination.offset,
      take: pagination.limit,
    });

    const mappedUsers: UserListItemDto[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      balance: user.balance,
      status: user.status,
      createdAt: user.createdAt,
    }));

    return createPaginatedResponse(mappedUsers, total, pagination);
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return this.mapUserToDto(user);
  }

  async getUserDetails(userId: string, transactionLimit = 10): Promise<UserDetailResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const recentTransactions = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: transactionLimit,
    });

    return {
      ...this.mapUserToDto(user),
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
    };
  }

  async getUserTransactions(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Transaction>> {
    const userExists = await this.userRepository.exists({
      where: { id: userId },
    });

    if (!userExists) {
      throw new UserNotFoundError(userId);
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: pagination.offset,
      take: pagination.limit,
    });

    return createPaginatedResponse(transactions, total, pagination);
  }

  async userExists(userId: string): Promise<boolean> {
    return this.userRepository.exists({ where: { id: userId } });
  }

  private mapUserToDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();
