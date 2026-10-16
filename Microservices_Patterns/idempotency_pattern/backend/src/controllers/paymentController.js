const paymentService = require('../services/paymentService');

class PaymentController {
  async transfer(req, res, next) {
    try {
      const { fromAccount, toAccount, amount, reason, delayMs } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || null;

      const result = await paymentService.executeTransfer({
        fromAccount: fromAccount || 'ACC-1001',
        toAccount: toAccount || 'ACC-2002',
        amount,
        reason,
        delayMs: delayMs !== undefined ? parseInt(delayMs, 10) : 600,
        idempotencyKey,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAccounts(req, res, next) {
    try {
      const accounts = await paymentService.getAccounts();
      return res.status(200).json({ accounts });
    } catch (err) {
      next(err);
    }
  }

  async getTransactions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '20', 10);
      const transactions = await paymentService.getTransactions(limit);
      return res.status(200).json({ transactions });
    } catch (err) {
      next(err);
    }
  }

  async getIdempotencyRecords(req, res, next) {
    try {
      const data = await paymentService.getIdempotencyRecords();
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async resetData(req, res, next) {
    try {
      const result = await paymentService.resetDatabase();
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
