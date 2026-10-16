/**
 * CORE DOMAIN SERVICE: CHECKOUT SERVICE
 * 
 * VAI TRÒ TRONG KIẾN TRÚC:
 * - Đây là "Trái tim" của hệ thống Thanh toán (Core Business Service).
 * - QUAN TRỌNG: CheckoutService HOÀN TOÀN KHÔNG PHỤ THUỘC vào bất kỳ thư viện cổng cụ thể nào.
 *   Nó chỉ tương tác với IPaymentGateway thông qua GatewayRegistry.
 * - Áp dụng các tiêu chuẩn Production:
 *   1. Idempotency Kiểm tra trùng lặp (tránh trừ tiền 2 lần).
 *   2. Circuit Breaker bảo vệ hệ thống trước sự cố nhà cung cấp.
 *   3. Ghi vết toàn diện (Comprehensive Audit Trail & Protocol Inspection).
 *   4. Lưu trữ cơ sở dữ liệu đồng thời hỗ trợ In-memory Fallback.
 */

const { v4: uuidv4 } = require('uuid');
const gatewayRegistry = require('../adapters/GatewayRegistry');
const circuitBreaker = require('./CircuitBreaker');
const { getCache, setCache } = require('../config/redis');
const db = require('../config/db');
const { UnifiedPaymentRequest, UnifiedRefundRequest, PaymentStatus } = require('../domain/PaymentDTOs');
const { PaymentGatewayException } = require('../domain/Exceptions');

class CheckoutService {
  /**
   * Thực hiện thanh toán đơn hàng
   */
  async processCheckout({
    orderId,
    gatewayId,
    amount,
    currency = 'USD',
    customerId = 'user_001',
    customerEmail = 'customer@example.com',
    idempotencyKey = null,
    paymentMethodDetails = {}
  }) {
    const startTime = Date.now();
    const finalIdempotencyKey = idempotencyKey || `idemp_${orderId}_${amount}_${gatewayId}`;

    // 1. KIỂM TRA IDEMPOTENCY KEY
    // Tránh việc mạng bị lag người dùng bấm nút 2 lần dẫn đến thanh toán 2 lần
    const cachedResponse = await getCache(`idemp:${finalIdempotencyKey}`);
    if (cachedResponse) {
      console.log(`[Idempotency] Phát hiện request trùng lặp với key: ${finalIdempotencyKey}. Trả về kết quả đã lưu trong Cache.`);
      return {
        ...cachedResponse,
        fromIdempotencyCache: true
      };
    }

    // 2. KIỂM TRA TRẠNG THÁI CIRCUIT BREAKER
    circuitBreaker.assertCanExecute(gatewayId);

    // 3. LẤY ADAPTER TƯƠNG ỨNG TỪ REGISTRY
    const adapter = gatewayRegistry.getAdapter(gatewayId);

    // 4. KHỞI TẠO DOMAIN REQUEST CHUẨN MỰC
    const domainRequest = new UnifiedPaymentRequest({
      orderId,
      amount,
      currency,
      customerId,
      customerEmail,
      idempotencyKey: finalIdempotencyKey,
      description: `OmniPay checkout for order #${orderId}`,
      paymentMethodDetails
    });

    let paymentResult = null;
    let failureError = null;

    try {
      // 5. GỌI PHƯƠNG THỨC CHUẨN QUA ADAPTER
      paymentResult = await adapter.processPayment(domainRequest);

      // Ghi nhận thành công cho Circuit Breaker
      circuitBreaker.recordSuccess(gatewayId);
    } catch (err) {
      // Ghi nhận lỗi cho Circuit Breaker
      circuitBreaker.recordFailure(gatewayId);
      failureError = err;
    }

    const durationMs = Date.now() - startTime;

    // 6. TỔNG HỢP VÀ LƯU VẾT GIAO DỊCH & AUDIT LOG
    const transactionRecord = {
      id: paymentResult ? paymentResult.transactionId : `TXN_ERR_${Date.now()}`,
      idempotency_key: finalIdempotencyKey,
      gateway_type: gatewayId,
      amount: domainRequest.amount,
      currency: domainRequest.currency,
      status: paymentResult ? paymentResult.status : PaymentStatus.FAILED,
      provider_txn_id: paymentResult ? paymentResult.providerTransactionId : null,
      error_message: failureError ? `${failureError.name}: ${failureError.message}` : null,
      metadata: {
        orderId,
        customerId,
        paymentMethodDetails
      },
      created_at: new Date().toISOString()
    };

    const auditLogRecord = {
      id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transaction_id: transactionRecord.id,
      gateway_type: gatewayId,
      action: 'PAYMENT_CHECKOUT',
      input_payload: domainRequest,
      transformation_steps: paymentResult?.transformationLogs || [
        { step: 'FAILED', detail: failureError?.message || 'Error occurred before completion' }
      ],
      raw_provider_request: paymentResult?.rawProviderResponse || null,
      raw_provider_response: paymentResult?.rawProviderResponse || null,
      normalized_output: paymentResult || { error: failureError?.message },
      duration_ms: durationMs,
      created_at: new Date().toISOString()
    };

    // Lưu vào PostgreSQL nếu có, nếu không lưu vào in-memory store
    await this.persistRecords(transactionRecord, auditLogRecord);

    // Lưu kết quả vào Cache Idempotency (thời hạn 10 phút)
    if (paymentResult && paymentResult.status === PaymentStatus.SUCCESS) {
      await setCache(`idemp:${finalIdempotencyKey}`, paymentResult, 600);
    }

    // Nếu có lỗi, ném ra sau khi đã lưu vết Audit đầy đủ
    if (failureError) {
      throw failureError;
    }

    return {
      ...paymentResult,
      durationMs,
      auditLogId: auditLogRecord.id
    };
  }

  /**
   * Xử lý hoàn tiền (Refund)
   */
  async processRefund({ transactionId, amount, reason }) {
    const txn = await this.getTransactionById(transactionId);
    if (!txn) {
      throw new Error(`Không tìm thấy giao dịch với ID: ${transactionId}`);
    }

    if (txn.status === PaymentStatus.REFUNDED) {
      throw new Error('Giao dịch này đã được hoàn tiền trước đó.');
    }

    const adapter = gatewayRegistry.getAdapter(txn.gateway_type);
    const refundRequest = new UnifiedRefundRequest({
      transactionId: txn.id,
      providerTransactionId: txn.provider_txn_id,
      amount: amount || txn.amount,
      currency: txn.currency,
      reason
    });

    const refundResult = await adapter.processRefund(refundRequest);

    // Cập nhật trạng thái giao dịch
    await this.updateTransactionStatus(txn.id, PaymentStatus.REFUNDED);

    return refundResult;
  }

  // --- CÁC HÀM LƯU TRỮ VÀ TRUY VẤN DỮ LIỆU ---

  async persistRecords(txn, audit) {
    if (db.isDbConnected()) {
      try {
        await db.query(
          `INSERT INTO transactions (id, idempotency_key, gateway_type, amount, currency, status, provider_txn_id, error_message, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [txn.id, txn.idempotency_key, txn.gateway_type, txn.amount, txn.currency, txn.status, txn.provider_txn_id, txn.error_message, JSON.stringify(txn.metadata)]
        );

        await db.query(
          `INSERT INTO audit_logs (id, transaction_id, gateway_type, action, input_payload, transformation_steps, raw_provider_request, raw_provider_response, normalized_output, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [audit.id, audit.transaction_id, audit.gateway_type, audit.action, JSON.stringify(audit.input_payload), JSON.stringify(audit.transformation_steps), JSON.stringify(audit.raw_provider_request), JSON.stringify(audit.raw_provider_response), JSON.stringify(audit.normalized_output), audit.duration_ms]
        );
        return;
      } catch (err) {
        console.warn(`[DB Insert Error]: ${err.message}. Fallback sang Memory Store.`);
      }
    }

    // In-memory fallback
    const mem = db.getMemoryStore();
    mem.transactions.unshift(txn);
    mem.auditLogs.unshift(audit);
    if (mem.transactions.length > 200) mem.transactions.pop();
    if (mem.auditLogs.length > 200) mem.auditLogs.pop();
  }

  async getTransactionById(id) {
    if (db.isDbConnected()) {
      const res = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
      if (res && res.rows.length > 0) return res.rows[0];
    }
    const mem = db.getMemoryStore();
    return mem.transactions.find((t) => t.id === id);
  }

  async updateTransactionStatus(id, newStatus) {
    if (db.isDbConnected()) {
      await db.query('UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newStatus, id]);
    }
    const mem = db.getMemoryStore();
    const target = mem.transactions.find((t) => t.id === id);
    if (target) target.status = newStatus;
  }

  async listRecentTransactions(limit = 20) {
    if (db.isDbConnected()) {
      const res = await db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
      if (res) return res.rows;
    }
    return db.getMemoryStore().transactions.slice(0, limit);
  }

  async listRecentAuditLogs(limit = 20) {
    if (db.isDbConnected()) {
      const res = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
      if (res) return res.rows;
    }
    return db.getMemoryStore().auditLogs.slice(0, limit);
  }
}

const checkoutServiceInstance = new CheckoutService();

module.exports = checkoutServiceInstance;
