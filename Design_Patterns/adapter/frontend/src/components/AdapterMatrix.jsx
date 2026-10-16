import React from 'react';
import { Layers, Check, X, Shield, Cpu, Zap, Code2 } from 'lucide-react';

export default function AdapterMatrix() {
  const MATRIX_DATA = [
    {
      field: 'Target Interface (Port)',
      stripe: 'IPaymentGateway',
      paypal: 'IPaymentGateway',
      vnpay: 'IPaymentGateway',
      bank: 'IPaymentGateway',
      highlight: true
    },
    {
      field: 'Adaptee Thô (Vendor SDK)',
      stripe: 'StripeClientSdk (npm stripe)',
      paypal: 'PayPalClientSdk (REST v2)',
      vnpay: 'VNPayGatewayClient (Custom IPN)',
      bank: 'LegacyBankXmlHost (Mainframe SOAP)'
    },
    {
      field: 'Giao thức Mạng (Wire Protocol)',
      stripe: 'HTTPS / JSON',
      paypal: 'HTTPS / REST v2 JSON',
      vnpay: 'HTTPS / URL Query Params',
      bank: 'HTTP / XML SOAP 1.1 Envelope'
    },
    {
      field: 'Đơn vị Tiền tệ (Unit Conversion)',
      stripe: 'Integer Cents ($10.50 -> 1050)',
      paypal: '2-Decimal String ("10.50")',
      vnpay: 'VND x 100 (100,000 -> 10000000)',
      bank: 'Numeric RemittanceAmount'
    },
    {
      field: 'Cơ Chế Bảo Mật & Xác Thực',
      stripe: 'Bearer API Key + Idempotency-Key Header',
      paypal: 'OAuth2 Bearer Token Exchange',
      vnpay: 'HMAC-SHA512 Hash trên Sorted Params',
      bank: 'SecurityToken + MessageCorrelationId'
    },
    {
      field: 'Chuẩn Hóa Mã Lỗi (Exception Translation)',
      stripe: 'StripeCardError -> InsufficientFunds / InvalidCard',
      paypal: 'INSTRUMENT_DECLINED -> InsufficientFunds',
      vnpay: 'vnp_ResponseCode "51" -> InsufficientFunds, "07" -> Fraud',
      bank: 'HOST_ERR_51 -> InsufficientFunds, HOST_ERR_91 -> Timeout'
    },
    {
      field: 'Mô Hình Triển Khai (Adapter Model)',
      stripe: 'Object Adapter (Composition)',
      paypal: 'Object Adapter (Composition)',
      vnpay: 'Object Adapter (Composition)',
      bank: 'Object Adapter (Composition)'
    },
    {
      field: 'Độ Phức Tạp Chuyển Đổi (Conversion Overhead)',
      stripe: 'Thấp (O(1) JSON Mapping)',
      paypal: 'Trung bình (OAuth handshake + O(1) JSON)',
      vnpay: 'Trung bình (Key sorting O(N log N) + HMAC-SHA512)',
      bank: 'Cao (XML String Concatenation & Parsing regex)'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Bảng Ma Trận So Sánh Các Adapter (Architectural Matrix)</span>
              <span className="badge badge-info text-[10px]">First-Principles View</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Phân tích chi tiết sự khác biệt về tầng truyền dẫn, định dạng dữ liệu, cơ chế mã hóa và chi phí 
              CPU/Memory giữa các Adapter trong hệ thống.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="glass-panel overflow-hidden border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-4 px-5 font-bold text-slate-300 w-1/5">Tiêu Chí Kỹ Thuật</th>
                <th className="py-4 px-5 text-purple-400 w-1/5">Stripe Adapter</th>
                <th className="py-4 px-5 text-blue-400 w-1/5">PayPal Adapter</th>
                <th className="py-4 px-5 text-rose-400 w-1/5">VNPay Adapter</th>
                <th className="py-4 px-5 text-amber-400 w-1/5">Legacy Core Bank Host</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {MATRIX_DATA.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    row.highlight
                      ? 'bg-indigo-950/20 font-semibold'
                      : idx % 2 === 0
                      ? 'bg-slate-900/20 hover:bg-slate-800/30'
                      : 'bg-transparent hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-3.5 px-5 font-medium text-slate-200 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>{row.field}</span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-300 font-mono text-[11px]">{row.stripe}</td>
                  <td className="py-3.5 px-5 text-slate-300 font-mono text-[11px]">{row.paypal}</td>
                  <td className="py-3.5 px-5 text-slate-300 font-mono text-[11px]">{row.vnpay}</td>
                  <td className="py-3.5 px-5 text-slate-300 font-mono text-[11px]">{row.bank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hexagonal Architecture Principle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 space-y-3 border-purple-500/20">
          <div className="flex items-center space-x-2 text-purple-400">
            <Cpu className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">1. Object vs Class Adapter</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống áp dụng <strong>Object Adapter</strong> (dùng Composition / Has-A thay vì Inheritance / Is-A). 
            Adapter nắm giữ instance của Vendor Client. Điều này cho phép tráo đổi Adaptee lúc runtime và 
            không làm bẩn class namespace.
          </p>
        </div>

        <div className="glass-panel p-5 space-y-3 border-blue-500/20">
          <div className="flex items-center space-x-2 text-blue-400">
            <Zap className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">2. Inversion of Control</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Core Service (CheckoutService) chỉ khai báo phụ thuộc vào <code className="text-indigo-300">IPaymentGateway</code>. 
            GatewayRegistry đóng vai trò Dependency Injection Container, phân giải adapter thích hợp mà không cần sửa 
            logic giỏ hàng.
          </p>
        </div>

        <div className="glass-panel p-5 space-y-3 border-emerald-500/20">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Shield className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-200">3. Exception Shielding</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Không một exception nào từ thư viện bên ngoài (như StripeCardError hay XML parse exception) được phép 
            bay thẳng lên Controller. Adapter bắt buộc phải bắt (catch) và bọc lại thành <strong>Domain Exception</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
