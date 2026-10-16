/**
 * ADAPTEE 1: STRIPE OFFICIAL SDK SIMULATOR
 * 
 * Đây là thư viện bên thứ 3 của Stripe.
 * ĐẶC ĐIỂM RIÊNG CỦA STRIPE:
 * 1. Tiền tệ tính bằng Cents (số nguyên): Ví dụ 10 USD -> 1000 cents.
 * 2. Idempotency Key được truyền qua header HTTP: { idempotencyKey: 'xxx' }.
 * 3. Kết quả trả về kiểu PaymentIntent/Charge với status: 'succeeded' | 'requires_action' | 'failed'.
 * 4. Ném ra ngoại lệ chuyên biệt: StripeCardError, StripeRateLimitError...
 */

class StripeClientSdk {
  constructor(apiKey = 'sk_test_mock_stripe_key_999') {
    this.apiKey = apiKey;
  }

  async createCharge(params, options = {}) {
    // Giả lập network latency 150ms - 300ms
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 150));

    const { amount, currency, source, description, metadata } = params;
    const idempotencyKey = options.idempotencyKey;

    // Kiểm tra tính hợp lệ kiểu dữ liệu riêng của Stripe (bắt buộc số nguyên cents)
    if (!Number.isInteger(amount)) {
      throw new Error(`StripeInvalidRequestError: Amount must be an integer (in cents). Received: ${amount}`);
    }

    // Giả lập kịch bản test lỗi thông qua số tiền hoặc mã thẻ
    if (source === 'tok_chargeDeclined' || metadata?.simulateError === 'card_declined') {
      const err = new Error('Your card was declined.');
      err.type = 'StripeCardError';
      err.code = 'card_declined';
      err.decline_code = 'generic_decline';
      throw err;
    }

    if (source === 'tok_insufficientFunds' || metadata?.simulateError === 'insufficient_funds') {
      const err = new Error('Your card has insufficient funds.');
      err.type = 'StripeCardError';
      err.code = 'card_declined';
      err.decline_code = 'insufficient_funds';
      throw err;
    }

    if (metadata?.simulateError === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const err = new Error('StripeConnectionError: Connection to Stripe API timed out.');
      err.type = 'StripeConnectionError';
      throw err;
    }

    // Trả về đối tượng Charge chuẩn Stripe
    return {
      id: `ch_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      object: 'charge',
      amount: amount, // in cents
      currency: currency.toLowerCase(),
      paid: true,
      status: 'succeeded',
      idempotency_key: idempotencyKey,
      payment_method_details: {
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2028
        }
      },
      receipt_url: `https://dashboard.stripe.com/receipts/ch_mock_${Date.now()}`,
      created: Math.floor(Date.now() / 1000)
    };
  }

  async createRefund(chargeId, params = {}) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      id: `re_stripe_${Date.now()}`,
      object: 'refund',
      amount: params.amount,
      charge: chargeId,
      currency: 'usd',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000)
    };
  }
}

module.exports = StripeClientSdk;
