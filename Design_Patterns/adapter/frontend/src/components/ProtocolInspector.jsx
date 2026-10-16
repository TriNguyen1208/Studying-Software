import React, { useState } from 'react';
import { FileCode, ArrowRight, ShieldCheck, Terminal, Layers, RefreshCw } from 'lucide-react';

export default function ProtocolInspector({ lastPayload }) {
  const [activeStepTab, setActiveStepTab] = useState(0);

  // Dữ liệu mặc định nếu chưa bấm thanh toán lần nào
  const inspectionData = lastPayload || {
    orderId: 'ORD_DEMO_SAMPLE',
    gatewayType: 'stripe',
    amount: 199.00,
    currency: 'USD',
    status: 'SUCCESS',
    providerTransactionId: 'ch_stripe_demo_mock_123',
    transformationLogs: [
      { step: '1_RECEIVE_REQUEST', detail: 'Nhận UnifiedPaymentRequest từ Domain Core', input: { amount: 199.00, currency: 'USD' } },
      { step: '2_ADAPT_PAYLOAD', detail: 'Đổi USD sang Cents (199.00 * 100 = 19900 cents) và thiết lập Idempotency Key', adaptedPayload: { amount: 19900, currency: 'usd', source: 'tok_visa' } },
      { step: '3_DISPATCH_TO_ADAPTEE', detail: 'Gọi phương thức createCharge() trên StripeClientSdk' },
      { step: '4_NORMALIZE_RESPONSE', detail: 'Chuyển đổi đối tượng Stripe Charge về UnifiedPaymentResult chuẩn mực', status: 'SUCCESS' }
    ],
    rawProviderResponse: {
      id: 'ch_stripe_demo_mock_123',
      amount: 19900,
      currency: 'usd',
      status: 'succeeded',
      paid: true
    }
  };

  const logs = inspectionData.transformationLogs || [];

  return (
    <div className="space-y-8">
      {/* Header explanation */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Deep Protocol & Transformation Inspector</span>
              <span className="badge badge-info uppercase text-[10px]">{inspectionData.gatewayType}</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Trực quan hóa hành trình một gói tin: Từ <strong>Domain Entity nội bộ</strong> đi qua 
              <strong> Adapter Transformation Pipeline</strong> để dịch ra <strong>Wire Protocol thô của bên thứ 3</strong>, 
              sau đó chuẩn hóa ngược về <strong>Domain Result</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Column Transformation Pipeline Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Column 1: Domain Input */}
        <div className="glass-panel p-5 space-y-3 flex flex-col border-indigo-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-xs flex items-center justify-center font-bold">1</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Domain Request</h3>
            </div>
            <span className="badge badge-info text-[9px]">Internal DTO</span>
          </div>
          <p className="text-xs text-slate-400">Giao diện thống nhất mà toàn bộ hệ sinh thái của bạn sử dụng.</p>
          <div className="flex-1">
            <pre className="code-block text-[11px] h-64 overflow-y-auto">
{JSON.stringify({
  orderId: inspectionData.orderId,
  amount: inspectionData.amount,
  currency: inspectionData.currency,
  customerId: 'cust_developer_88',
  idempotencyKey: `idemp_${inspectionData.orderId}`,
  description: `Payment for ${inspectionData.orderId}`
}, null, 2)}
            </pre>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            Type: <span className="text-indigo-300">UnifiedPaymentRequest</span>
          </div>
        </div>

        {/* Column 2: Adapter Transformation Logic */}
        <div className="glass-panel p-5 space-y-3 flex flex-col border-purple-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs flex items-center justify-center font-bold">2</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Adapter Engine</h3>
            </div>
            <span className="badge badge-info text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">TRANSLATION</span>
          </div>
          <p className="text-xs text-slate-400">Các bước xử lý logic, tính hash, đổi đơn vị mảng byte.</p>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-64 pr-1">
            {logs.map((log, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span className="font-mono text-purple-300 font-bold">{log.step}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-tight">{log.detail}</p>
                {log.secureHash && (
                  <p className="text-amber-400 font-mono text-[10px] break-all">HMAC: {log.secureHash}</p>
                )}
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            Pipeline: <span className="text-purple-300">{logs.length} Operations executed</span>
          </div>
        </div>

        {/* Column 3: Raw Provider Protocol & Wire Format */}
        <div className="glass-panel p-5 space-y-3 flex flex-col border-cyan-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold">3</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Raw Adaptee Wire</h3>
            </div>
            <span className="badge badge-info text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30">3RD PARTY PROTOCOL</span>
          </div>
          <p className="text-xs text-slate-400">Giao thức dị biệt thực tế gửi qua socket đến nhà cung cấp.</p>
          <div className="flex-1">
            <pre className="code-block text-[11px] h-64 overflow-y-auto text-cyan-300">
{typeof inspectionData.rawProviderResponse === 'object' && inspectionData.rawProviderResponse?.rawXml
  ? inspectionData.rawProviderResponse.rawXml
  : JSON.stringify(inspectionData.rawProviderResponse || { notice: 'No raw wire response recorded' }, null, 2)}
            </pre>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            Format: <span className="text-cyan-300">
              {inspectionData.gatewayType === 'legacy_bank_xml' ? 'SOAP 1.1 Envelope' : 
               inspectionData.gatewayType === 'vnpay' ? 'URL Query + HMAC-SHA512' : 
               inspectionData.gatewayType === 'stripe' ? 'JSON (Cents & Idemp Header)' : 'REST v2 Orders JSON'}
            </span>
          </div>
        </div>

        {/* Column 4: Normalized Domain Result */}
        <div className="glass-panel p-5 space-y-3 flex flex-col border-emerald-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">4</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Normalized Output</h3>
            </div>
            <span className={`badge text-[9px] ${inspectionData.status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}`}>
              {inspectionData.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">Kết quả được dịch chuẩn hóa trả về cho Core Domain.</p>
          <div className="flex-1">
            <pre className="code-block text-[11px] h-64 overflow-y-auto text-emerald-300">
{JSON.stringify({
  transactionId: inspectionData.transactionId || `TXN_${Date.now()}`,
  orderId: inspectionData.orderId,
  gatewayType: inspectionData.gatewayType,
  status: inspectionData.status,
  amount: inspectionData.amount,
  currency: inspectionData.currency,
  providerTransactionId: inspectionData.providerTransactionId,
  error: inspectionData.errorMessage || null
}, null, 2)}
            </pre>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            Result: <span className="text-emerald-300">UnifiedPaymentResult</span>
          </div>
        </div>
      </div>

      {/* Deep Dive Note Box */}
      <div className="glass-panel p-5 border-slate-800 bg-slate-950/40 text-xs text-slate-400 space-y-2">
        <h4 className="font-bold text-slate-200 flex items-center space-x-2">
          <span>🧠 Vì sao Adapter Pattern là mẫu thiết kế cấu trúc (Structural Pattern) số một ở đây?</span>
        </h4>
        <p className="leading-relaxed">
          Hãy quan sát: Cột 1 và Cột 4 có giao diện hoàn toàn giống nhau bất kể bạn chọn cổng nào. 
          Toàn bộ sự khác biệt "kinh hoàng" giữa JSON Cents của Stripe, OAuth2 của PayPal, HMAC của VNPay, 
          và XML SOAP của Ngân hàng cũ <strong>được cô lập hoàn toàn bên trong Cột 2 & Cột 3</strong>. 
          Nếu ngày mai một cổng thanh toán đổi cấu trúc API (Breaking API change), bạn chỉ cần sửa đúng 1 file Adapter duy nhất.
        </p>
      </div>
    </div>
  );
}
