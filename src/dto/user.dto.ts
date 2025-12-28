import { UserStatus } from '../entities';
import { TransactionResponseDto } from './wallet.dto';

export class UserResponseDto {
  id: string;
  username: string;
  email: string | null;
  balance: number;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class UserDetailResponseDto extends UserResponseDto {
  recentTransactions: TransactionResponseDto[];
}

export class UserListItemDto {
  id: string;
  username: string;
  balance: number;
  status: UserStatus;
  createdAt: Date;
}
