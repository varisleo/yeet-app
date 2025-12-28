import { IsInt, IsPositive, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreditDebitDto {
  @IsInt({ message: 'Amount must be an integer (in cents)' })
  @IsPositive({ message: 'Amount must be a positive number' })
  @Min(1, { message: 'Amount must be at least 1 cent' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}

export class TransactionResponseDto {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: Date;
}

export class WalletOperationResponseDto {
  success: boolean;
  transaction: TransactionResponseDto;
  previousBalance: number;
  newBalance: number;
}
