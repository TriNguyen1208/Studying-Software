/**
 * DATABASE SEEDING SCRIPT
 * 
 * Nạp dữ liệu mẫu ban đầu vào PostgreSQL hoặc in-memory store để kiểm thử hệ thống.
 * Cung cấp sẵn các giao dịch tiêu biểu của cả 4 cổng:
 * - Stripe (USD - thẻ tín dụng quốc tế)
 * - PayPal (USD - thanh toán ví điện tử)
 * - VNPay (VND - thanh toán nội địa QR / ATM)
 * - Legacy Core Banking (VND - hạch toán chuyển khoản Mainframe SOAP XML)
 */

const { initDatabase, query, isDbConnected, closePool } = require('./src/config/db');

async function seed() {
  console.log('[Seed] Bắt đầu nạp dữ liệu mẫu ban đầu...');
  await initDatabase();

  const sampleTransactions = [
    {
      id: 'TXN_INIT_STRIPE_001',
      idempotency_key: 'idemp_sample_order_1001_usd',
      gateway_type: 'stripe',
      amount: 49.99,
      currency: 'USD',
      status: 'SUCCESS',
      provider_txn_id: 'ch_stripe_initial_mock_991',
      error_message: null,
      metadata: { orderId: 'ORD_1001', customerId: 'cust_alice', item: 'Mechanical Keyboard Pro' }
    },
    {
      id: 'TXN_INIT_PAYPAL_002',
      idempotency_key: 'idemp_sample_order_1002_usd',
      gateway_type: 'paypal',
      amount: 120.00,
      currency: 'USD',
      status: 'SUCCESS',
      provider_txn_id: 'CAP_PAYPAL_INIT_882',
      error_message: null,
      metadata: { orderId: 'ORD_1002', customerId: 'cust_bob', item: 'Ultra-wide Monitor 34-inch' }
    },
    {
      id: 'TXN_INIT_VNPAY_003',
      idempotency_key: 'idemp_sample_order_1003_vnd',
      gateway_type: 'vnpay',
      amount: 1500000.00,
      currency: 'VND',
      status: 'SUCCESS',
      provider_txn_id: 'VNP_INIT_TRANS_773',
      error_message: null,
      metadata: { orderId: 'ORD_1003', customerId: 'cust_nguyen_van_a', item: 'Gói Hội Viên Thường Niên' }
    },
    {
      id: 'TXN_INIT_BANK_004',
      idempotency_key: 'idemp_sample_order_1004_vnd',
      gateway_type: 'legacy_bank_xml',
      amount: 8500000.00,
      currency: 'VND',
      status: 'SUCCESS',
      provider_txn_id: 'BNK_TXN_HOST_664',
      error_message: null,
      metadata: { orderId: 'ORD_1004', customerId: 'cust_cong_ty_b', item: 'Hợp Đồng B2B Doanh Nghiệp' }
    }
  ];

  if (isDbConnected()) {
    for (const t of sampleTransactions) {
      await query(
        `INSERT INTO transactions (id, idempotency_key, gateway_type, amount, currency, status, provider_txn_id, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [t.id, t.idempotency_key, t.gateway_type, t.amount, t.currency, t.status, t.provider_txn_id, t.error_message, JSON.stringify(t.metadata)]
      );
    }
    console.log(`[Seed] Đã nạp thành công ${sampleTransactions.length} giao dịch mẫu vào PostgreSQL!`);
  } else {
    console.log(`[Seed] Database PostgreSQL chưa bật, các giao dịch mẫu sẽ được mô phỏng khi khởi động server.`);
  }

  await closePool();
}

seed().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
