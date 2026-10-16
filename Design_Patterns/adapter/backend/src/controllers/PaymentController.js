/**
 * PAYMENT API CONTROLLER
 * 
 * Tiếp nhận HTTP requests, kiểm tra validation đầu vào,
 * và điều hướng vào CheckoutService.
 */

const checkoutService = require('../services/CheckoutService');

class PaymentController {
  async checkout(req, res, next) {
    try {
      const {
        orderId,
        gatewayId,
        amount,
        currency,
        customerId,
        customerEmail,
        idempotencyKey,
        paymentMethodDetails
      } = req.body;

      if (!orderId || !gatewayId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu các trường bắt buộc: orderId, gatewayId, amount'
        });
      }

      const result = await checkoutService.processCheckout({
        orderId,
        gatewayId,
        amount,
        currency,
        customerId,
        customerEmail,
        idempotencyKey,
        paymentMethodDetails
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async refund(req, res, next) {
    try {
      const { transactionId, amount, reason } = req.body;
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu transactionId để hoàn tiền'
        });
      }

      const result = await checkoutService.processRefund({
        transactionId,
        amount,
        reason
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getTransactions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '20', 10);
      const list = await checkoutService.listRecentTransactions(limit);
      return res.status(200).json({
        success: true,
        data: list
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '20', 10);
      const logs = await checkoutService.listRecentAuditLogs(limit);
      return res.status(200).json({
        success: true,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  }
}

const paymentControllerInstance = new PaymentController();

module.exports = paymentControllerInstance;
