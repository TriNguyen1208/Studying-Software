/**
 * domain/Transaction.ts - Thực Thể Giao Dịch
 */

export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'PAYMENT';

export class Transaction {
  constructor(
    public readonly id: string,
    public readonly accountId: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly balanceAfter: number,
    public readonly description: string,
    public readonly createdAt: string
  ) {}

  public static create(
    accountId: string,
    type: TransactionType,
    amount: number,
    balanceAfter: number,
    description: string
  ): Transaction {
    const id = `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return new Transaction(id, accountId, type, amount, balanceAfter, description, new Date().toISOString());
  }
}
