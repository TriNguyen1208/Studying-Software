import React, { useState } from 'react';
import { CreditCard, DollarSign, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, Cpu, ShoppingBag } from 'lucide-react';
import { api } from '../services/api';

const SAMPLE_PRODUCTS = [
  { id: 'PROD_1', name: 'Keychron Q1 Pro Wireless Keyboard', priceUsd: 199.00, priceVnd: 5054000, category: 'Hardware' },
  { id: 'PROD_2', name: 'Dell UltraSharp 32" 4K Monitor', priceUsd: 749.00, priceVnd: 19024000, category: 'Displays' },
  { id: 'PROD_3', name: 'Enterprise Cloud Infrastructure Tier-1', priceUsd: 1200.00, priceVnd: 30480000, category: 'SaaS' },
  { id: 'PROD_4', name: 'DevOps Microservices Book Bundle', priceUsd: 49.00, priceVnd: 1244000, category: 'Education' }
];

const GATEWAYS = [
  {
    id: 'stripe',
    name: 'Stripe Adapter',
    desc: 'Target: IPaymentGateway -> Adaptee: Stripe SDK (Charges in Cents, Idempotency-Key Header)',
    color: 'from-purple-600 to-indigo-600',
    icon: '💳',
    currencies: ['USD', 'EUR']
  },
  {
    id: 'paypal',
    name: 'PayPal Adapter',
    desc: 'Target: IPaymentGateway -> Adaptee: PayPal v2 (OAuth2 token, Decimal string value)',
    color: 'from-blue-600 to-cyan-600',
    icon: '🅿️',
    currencies: ['USD', 'EUR']
  },
  {
    id: 'vnpay',
    name: 'VNPay Adapter',
    desc: 'Target: IPaymentGateway -> Adaptee: VNPay Client (HMAC-SHA512 checksum, VND x 100)',
    color: 'from-red-600 to-rose-600',
    icon: '🇻🇳',
    currencies: ['VND', 'USD']
  },
  {
    id: 'legacy_bank_xml',
    name: 'Legacy Bank Host (XML/SOAP)',
    desc: 'Target: IPaymentGateway -> Adaptee: Mainframe Host (SOAP Envelope, XML Marshalling)',
    color: 'from-amber-600 to-orange-600',
    icon: '🏦',
    currencies: ['VND', 'USD']
  }
];

export default function CheckoutTerminal({ onPaymentSuccess, onInspectPayload }) {
  const [selectedProduct, setSelectedProduct] = useState(SAMPLE_PRODUCTS[0]);
  const [selectedGateway, setSelectedGateway] = useState('stripe');
  const [currency, setCurrency] = useState('USD');
  const [simulateError, setSimulateError] = useState('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);
  const [errorFeedback, setErrorFeedback] = useState(null);

  const amount = currency === 'USD' ? selectedProduct.priceUsd : selectedProduct.priceVnd;

  async function handleExecuteCheckout(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setTransactionResult(null);
    setErrorFeedback(null);

    const orderId = `ORD_${Date.now()}`;
    const payload = {
      orderId,
      gatewayId: selectedGateway,
      amount,
      currency,
      customerId: 'cust_developer_88',
      customerEmail: 'dev@omnipay.local',
      idempotencyKey: `idemp_${orderId}_${selectedGateway}`,
      paymentMethodDetails: {
        simulateError: simulateError !== 'none' ? simulateError : undefined,
        token: simulateError === 'card_declined' ? 'tok_chargeDeclined' : 'tok_visa',
        accountNo: '9900881122334'
      }
    };

    try {
      const response = await api.checkout(payload);
      setTransactionResult(response.data);
      if (onPaymentSuccess) onPaymentSuccess(response.data);
      if (onInspectPayload) onInspectPayload(response.data);
    } catch (err) {
      setErrorFeedback({
        message: err.message,
        data: err.data,
        status: err.status
      });
      // Vẫn kích hoạt inspector để người học xem adapter đã dịch ngoại lệ thế nào
      if (onInspectPayload) {
        onInspectPayload({
          orderId,
          gatewayType: selectedGateway,
          status: 'FAILED',
          amount,
          currency,
          errorMessage: err.message,
          errorType: err.data?.errorType || 'PAYMENT_FAILED',
          transformationLogs: [
            { step: '1_RECEIVE_REQUEST', detail: 'Nhận request thanh toán' },
            { step: 'EXCEPTION_TRANSLATION', detail: `Adapter đã dịch lỗi nhà cung cấp sang Domain Exception: ${err.message}` }
          ]
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner explaining the Pattern in this screen */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Hệ Thống Checkout Đa Cổng (Unified Payment Terminal)</span>
              <span className="badge badge-info">Design Pattern In Action</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Mã nguồn Checkout Service ở Backend <strong>chỉ gọi một hàm duy nhất</strong>: <code className="text-indigo-300 font-mono">adapter.processPayment(domainRequest)</code>. 
              Bạn có thể chọn bất kỳ cổng thanh toán nào dưới đây để kiểm chứng: dù là Stripe (Cents), PayPal (v2 JSON), VNPay (HMAC-SHA512) hay Ngân hàng cổ điển (SOAP XML), 
              <strong>Adapter</strong> sẽ âm thầm đóng gói, chuyển đổi kiểu dữ liệu và dịch ngược kết quả về chuẩn mực chung!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleExecuteCheckout} className="glass-panel p-6 space-y-6">
            {/* Step 1: Chọn sản phẩm */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>1. Chọn Đơn Hàng Mẫu (E-Commerce Product)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_PRODUCTS.map((prod) => {
                  const isSelected = selectedProduct.id === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProduct(prod)}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/10'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-indigo-400">{prod.category}</span>
                        <span className="text-xs font-bold text-emerald-400">
                          {currency === 'USD' ? `$${prod.priceUsd}` : `${prod.priceVnd.toLocaleString('vi-VN')} ₫`}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-slate-200 mt-1 line-clamp-1">{prod.name}</h4>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Chọn Loại Tiền Tệ & Cổng Thanh Toán */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>2. Chọn Cổng Thanh Toán (Target Interface: IPaymentGateway)</span>
                </label>
                {/* Currency Switcher */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-2.5 py-1 rounded font-mono font-bold transition-all ${
                      currency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('VND')}
                    className={`px-2.5 py-1 rounded font-mono font-bold transition-all ${
                      currency === 'VND' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    VND (₫)
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {GATEWAYS.map((gw) => {
                  const isSelected = selectedGateway === gw.id;
                  return (
                    <div
                      key={gw.id}
                      onClick={() => setSelectedGateway(gw.id)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-slate-850 shadow-lg shadow-indigo-500/10'
                          : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{gw.icon}</span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-sm text-slate-100">{gw.name}</h4>
                              {isSelected && <span className="badge badge-success text-[10px]">ACTIVE ADAPTER</span>}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{gw.desc}</p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="gateway"
                          checked={isSelected}
                          onChange={() => setSelectedGateway(gw.id)}
                          className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Thử nghiệm kịch bản giả lập lỗi (Exception Translation Testing) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>3. Giả Lập Kịch Bản Test (Exception Translation)</span>
              </label>
              <select
                value={simulateError}
                onChange={(e) => setSimulateError(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="none">🟢 Thanh toán thành công bình thường (200 OK)</option>
                <option value="insufficient_funds">🔴 Lỗi không đủ tiền trong thẻ/tài khoản (Insufficient Funds)</option>
                <option value="card_declined">🔴 Lỗi thẻ bị từ chối / hết hạn (Card Declined)</option>
                <option value="fraud">🔴 Lỗi nghi ngờ gian lận (Fraud Detected - VNPay)</option>
                <option value="timeout">🟡 Lỗi quá thời gian phản hồi mạng (Gateway Timeout - 3s delay)</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isSubmitting
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:brightness-110 shadow-indigo-500/25 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Adapter đang biến đổi và truyền tải dữ liệu...</span>
                </>
              ) : (
                <>
                  <span>Thanh Toán Ngay ({currency === 'USD' ? `$${amount}` : `${amount.toLocaleString('vi-VN')} ₫`})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Execution Summary & Real-time Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Trạng Thái Giao Dịch Vừa Thực Hiện</span>
              <span className="text-xs font-mono text-slate-500">Live Feedback</span>
            </h3>

            {/* Waiting State */}
            {!transactionResult && !errorFeedback && !isSubmitting && (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-400">
                  Chọn sản phẩm và bấm <strong>"Thanh Toán Ngay"</strong> để xem Adapter xử lý dữ liệu theo thời gian thực.
                </p>
              </div>
            )}

            {/* Submitting Loading State */}
            {isSubmitting && (
              <div className="p-8 text-center border border-indigo-500/30 bg-indigo-950/20 rounded-xl space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
                <p className="text-sm font-semibold text-indigo-200">
                  Đang qua Adapter: Mapping DTO, định dạng tiền tệ, đóng gói gói tin...
                </p>
              </div>
            )}

            {/* Success State */}
            {transactionResult && (
              <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-200 text-sm">GIAO DỊCH THÀNH CÔNG</h4>
                    <p className="text-xs text-emerald-400/80 font-mono">Status: {transactionResult.status}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">OmniPay Txn ID:</span>
                    <span className="text-slate-200 font-bold">{transactionResult.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Provider Txn ID:</span>
                    <span className="text-indigo-400">{transactionResult.providerTransactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gateway:</span>
                    <span className="text-slate-200 uppercase">{transactionResult.gatewayType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thời gian xử lý:</span>
                    <span className="text-amber-400">{transactionResult.durationMs}ms</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  💡 Chuyển sang tab <strong>"Protocol Inspector"</strong> để xem chi tiết từng bước chuyển đổi mảng byte, chữ ký và payload!
                </p>
              </div>
            )}

            {/* Error Feedback State */}
            {errorFeedback && (
              <div className="p-5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-4">
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-7 h-7 text-rose-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-rose-200 text-sm">NGOẠI LỆ ĐÃ ĐƯỢC CHUẨN HÓA</h4>
                    <p className="text-xs text-rose-400/80 font-mono">HTTP {errorFeedback.status} - {errorFeedback.data?.errorType}</p>
                  </div>
                </div>

                <div className="text-xs font-mono bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                  <p className="text-rose-300 font-semibold">{errorFeedback.message}</p>
                  <p className="text-slate-500">Cổng phát sinh: {errorFeedback.data?.gateway || selectedGateway}</p>
                </div>

                <p className="text-xs text-slate-300">
                  🎯 <strong>Adapter Pattern Minh Chứng</strong>: Lỗi từ bên thứ 3 (như VNPay 51 hay SOAP Fault) đã được Adapter dịch gọn gàng thành Domain Exception mà không làm sập server!
                </p>
              </div>
            )}

            {/* Architectural Highlights */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Nguyên Lý Vận Hành</span>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong className="text-slate-200">Open/Closed Principle:</strong> Thêm cổng thanh toán mới chỉ cần tạo thêm class Adapter.</li>
                <li><strong className="text-slate-200">Single Responsibility:</strong> Logic chuyển đổi giao thức tách biệt hoàn toàn khỏi nghiệp vụ giỏ hàng.</li>
                <li><strong className="text-slate-200">Exception Translation:</strong> Không để lộ các biệt lệ vendor-specific lên tầng ứng dụng.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
