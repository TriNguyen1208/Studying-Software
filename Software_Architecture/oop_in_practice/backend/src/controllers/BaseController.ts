/**
 * controllers/BaseController.ts - Lớp Cơ Sở Cho Tầng Điều Khiển (Tính Kế Thừa)
 * 
 * 💡 TÍNH KẾ THỪA (INHERITANCE):
 * - Thay vì mỗi hàm xử lý API đều phải viết lặp lại cú pháp res.status(...).json(...),
 *   ta gom toàn bộ các hàm trả về chuẩn vào BaseController.
 * - Tự động bắt lỗi: Nếu lỗi là `instanceof BaseDomainError`, lấy luôn mã statusCode do Domain Error định nghĩa
 *   (ví dụ: InsufficientFundsError -> 422, AccountFrozenError -> 403).
 */

import { Response } from 'express';
import { BaseDomainError } from '../domain/errors/DomainErrors';

export abstract class BaseController {
  // Trả về HTTP 200 OK
  protected ok<T>(res: Response, data: T, message: string = "Thành công"): Response {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  // Trả về HTTP 201 Created
  protected created<T>(res: Response, data: T, message: string = "Tạo mới thành công"): Response {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  // Xử lý lỗi tập trung dựa trên Kế thừa Domain Error
  protected handleError(res: Response, error: unknown): Response {
    console.error('[CONTROLLER ERROR]:', error);

    if (error instanceof BaseDomainError) {
      return res.status(error.statusCode).json({
        success: false,
        errorType: error.name,
        isDomainViolation: true,
        message: error.message
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        errorType: error.name,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      errorType: 'InternalServerError',
      message: 'Đã xảy ra lỗi máy chủ nội bộ không lường trước.'
    });
  }
}
