/**
 * ADAPTEE 2: PAYPAL REST v2 SDK SIMULATOR
 * 
 * ĐẶC ĐIỂM RIÊNG CỦA PAYPAL:
 * 1. Tiền tệ truyền dưới dạng chuỗi string có 2 chữ số thập phân: { value: "10.50", currency_code: "USD" }.
 * 2. Luồng giao dịch 2 bước: Create Order -> Capture Order.
 * 3. Trạng thái phản hồi: 'COMPLETED', 'APPROVED', 'VOIDED'.
 * 4. Error response theo chuẩn PayPal: { name: 'UNPROCESSABLE_ENTITY', details: [...] }.
 */

class PayPalClientSdk {
  constructor(clientId = 'mock_paypal_client_id', secret = 'mock_secret') {
    this.clientId = clientId;
    this.secret = secret;
    this.accessToken = null;
  }

  async authenticate() {
    // Giả lập OAuth2 exchange
    this.accessToken = `A21AAN_${Date.now()}`;
    return this.accessToken;
  }

  async createAndCaptureOrder(orderPayload) {
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));

    const unit = orderPayload.purchase_units?.[0];
    const amountVal = unit?.amount?.value;
    const currencyCode = unit?.amount?.currency_code;

    // Kiểm tra định dạng chuỗi thập phân nghiêm ngặt của PayPal
    if (typeof amountVal !== 'string' || !/^\d+\.\d{2}$/.test(amountVal)) {
      throw new Error(`PayPalFormatError: Amount value must be a 2-decimal string like "10.00". Received: ${amountVal}`);
    }

    // Giả lập kiểm tra lỗi
    if (unit?.custom_id === 'simulate_insufficient_funds') {
      const err = new Error('The instrument presented was declined.');
      err.name = 'INSTRUMENT_DECLINED';
      err.details = [{ issue: 'PAYER_ACCOUNT_RESTRICTED', description: 'Insufficient funds or account locked' }];
      throw err;
    }

    if (unit?.custom_id === 'simulate_timeout') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const err = new Error('PayPalGatewayTimeout: Server timeout during order capture.');
      err.name = 'GATEWAY_TIMEOUT';
      throw err;
    }

    return {
      id: `PAYPAL-ORD-${Date.now()}`,
      status: 'COMPLETED',
      intent: 'CAPTURE',
      payer: {
        email_address: 'buyer@paypal-sandbox.com',
        payer_id: 'PP_PAYER_88921'
      },
      purchase_units: [
        {
          reference_id: unit.reference_id || 'default',
          payments: {
            captures: [
              {
                id: `CAP-${Date.now()}`,
                status: 'COMPLETED',
                amount: {
                  value: amountVal,
                  currency_code: currencyCode
                },
                seller_protection: {
                  status: 'ELIGIBLE'
                },
                create_time: new Date().toISOString()
              }
            ]
          }
        }
      ]
    };
  }

  async refundCapture(captureId, refundData) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return {
      id: `REFUND-PP-${Date.now()}`,
      status: 'COMPLETED',
      amount: refundData.amount,
      create_time: new Date().toISOString()
    };
  }
}

module.exports = PayPalClientSdk;
