/**
 * controllers/BankingController.ts - Controller Nghiệp Vụ Ngân Hàng
 * Kế thừa từ BaseController
 */

import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { BankingService } from '../services/BankingService';
import { SqliteBankAccountRepository } from '../repositories/SqliteBankAccountRepository';

export class BankingController extends BaseController {
  constructor(
    private readonly bankingService: BankingService,
    private readonly accountRepo: SqliteBankAccountRepository
  ) {
    super();
  }

  // GET /api/accounts
  public getAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const accounts = this.bankingService.listAccounts();
      this.ok(res, accounts, "Lấy danh sách tài khoản thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // POST /api/accounts/:id/deposit
  public deposit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { amount, description } = req.body;
      const result = this.bankingService.deposit(id, Number(amount), description);
      this.ok(res, result, "Nạp tiền thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // POST /api/accounts/:id/withdraw
  public withdraw = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { amount, description } = req.body;
      const result = this.bankingService.withdraw(id, Number(amount), description);
      this.ok(res, result, "Rút tiền thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // POST /api/accounts/transfer
  public transfer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sourceAccountId, targetAccountNumber, amount, description } = req.body;
      const result = this.bankingService.transfer(
        sourceAccountId,
        targetAccountNumber,
        Number(amount),
        description
      );
      this.ok(res, result, "Chuyển khoản thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // POST /api/accounts/:id/pay
  public payViaGateway = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { amount, gatewayType, itemDescription } = req.body;
      const result = await this.bankingService.payViaGateway(
        id,
        Number(amount),
        gatewayType,
        itemDescription
      );
      this.ok(res, result, "Thanh toán qua cổng thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // POST /api/accounts/:id/toggle-status
  public toggleStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = this.bankingService.toggleAccountStatus(id);
      this.ok(res, result, "Cập nhật trạng thái tài khoản thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // GET /api/database/raw
  // Soi chiếu dữ liệu vật lý thực tế trong file database.sqlite
  public getRawDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawData = this.accountRepo.getRawDatabaseState();
      this.ok(res, rawData, "Lấy trạng thái thực tế của file database.sqlite thành công");
    } catch (error) {
      this.handleError(res, error);
    }
  };
}
