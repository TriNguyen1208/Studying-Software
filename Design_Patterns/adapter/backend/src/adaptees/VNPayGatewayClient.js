/**
 * ADAPTEE 3: VNPAY GATEWAY CLIENT SIMULATOR
 * 
 * ĐẶC ĐIỂM RIÊNG CỦA VNPAY (Cổng thanh toán phổ biến tại Việt Nam):
 * 1. Tiền tệ bắt buộc là VND. Số tiền nhân 100 (Ví dụ: 100,000 VND -> vnp_Amount = 10000000).
 * 2. URL-encoded Query Params: Bắt buộc sắp xếp key theo thứ tự a-z (alphabetical sorting).
 * 3. Chữ ký số HMAC-SHA512 hash toàn bộ chuỗi query params với Secret Key.
 * 4. Mã phản hồi (vnp_ResponseCode):
 *    - "00": Giao dịch thành công.
 *    - "07": Nghi ngờ gian lận / thẻ bị khóa.
 *    - "51": Tài khoản không đủ số dư.
 *    - "24": Khách hàng hủy giao dịch.
 */

const crypto = require('crypto');

class VNPayGatewayClient {
  constructor({ tmnCode = 'VNPAY_TMN_9988', hashSecret = 'SECRET_KEY_VNPAY_HEX_ABC123' } = {}) {
    this.tmnCode = tmnCode;
    this.hashSecret = hashSecret;
  }

  calculateChecksum(params) {
    // Sắp xếp các tham số theo bảng chữ cái A-Z
    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys
      .filter((k) => k !== 'vnp_SecureHash' && params[k] !== undefined && params[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  }

  async submitPaymentRequest(rawVnpParams) {
    await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 100));

    // Xác minh chữ ký truyền vào
    const generatedHash = this.calculateChecksum(rawVnpParams);
    if (rawVnpParams.vnp_SecureHash !== generatedHash) {
      throw new Error('VNPaySecurityError: Invalid HMAC-SHA512 signature in request.');
    }

    // Giả lập kịch bản lỗi
    if (rawVnpParams.vnp_OrderInfo?.includes('simulate_insufficient_funds')) {
      return {
        vnp_ResponseCode: '51',
        vnp_TransactionStatus: '02',
        vnp_TxnRef: rawVnpParams.vnp_TxnRef,
        vnp_Amount: rawVnpParams.vnp_Amount,
        vnp_Message: 'Tai khoan cua Quy khach khong du so du de thuc hien giao dich.'
      };
    }

    if (rawVnpParams.vnp_OrderInfo?.includes('simulate_fraud')) {
      return {
        vnp_ResponseCode: '07',
        vnp_TransactionStatus: '02',
        vnp_TxnRef: rawVnpParams.vnp_TxnRef,
        vnp_Amount: rawVnpParams.vnp_Amount,
        vnp_Message: 'Giao dich bi nghi ngo gian lan hoac the bi khoa.'
      };
    }

    // Giả lập thành công
    return {
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: rawVnpParams.vnp_TxnRef,
      vnp_Amount: rawVnpParams.vnp_Amount,
      vnp_BankCode: rawVnpParams.vnp_BankCode || 'NCB',
      vnp_BankTranNo: `VNPAY_BANK_${Date.now()}`,
      vnp_CardType: 'ATM',
      vnp_PayDate: new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14),
      vnp_TransactionNo: `VNP_${Date.now()}`,
      vnp_SecureHash: this.calculateChecksum({
        vnp_ResponseCode: '00',
        vnp_TxnRef: rawVnpParams.vnp_TxnRef,
        vnp_Amount: rawVnpParams.vnp_Amount
      })
    };
  }

  async refundTransaction(refundParams) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      vnp_ResponseCode: '00',
      vnp_TxnRef: refundParams.vnp_TxnRef,
      vnp_Amount: refundParams.vnp_Amount,
      vnp_RefundNo: `VNP_REFUND_${Date.now()}`
    };
  }
}

module.exports = VNPayGatewayClient;
