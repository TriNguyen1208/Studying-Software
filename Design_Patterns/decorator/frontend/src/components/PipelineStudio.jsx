import React, { useState } from 'react';
import { Layers, Play, RefreshCw, CheckCircle2, ShieldAlert, Cpu, ArrowRight, Zap, Lock, Database, Clock, ShieldCheck, Flame } from 'lucide-react';
import { api } from '../services/api';

const AVAILABLE_DECORATORS = [
  { id: 'timing', name: 'Timing & Telemetry', desc: 'Đo lường thời gian nano-giây & biến thiên RAM Heap', icon: Clock, color: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'audit', name: 'Cryptographic Audit', desc: 'Tạo chữ ký SHA-256 bất biến & lưu vết thanh tra', icon: ShieldCheck, color: 'text-blue-400', border: 'border-blue-500/30' },
  { id: 'rateLimit', name: 'Token Bucket Rate Limiter', desc: 'Chặn đứng quá tải & short-circuit trước khi tới DB', icon: Flame, color: 'text-rose-400', border: 'border-rose-500/30' },
  { id: 'cache', name: 'Distributed Redis Cache', desc: 'Short-circuit trả về trong 0.8ms khi Cache Hit', icon: Zap, color: 'text-cyan-400', border: 'border-cyan-500/30' },
  { id: 'compression', name: 'Gzip Lossless Compression', desc: 'Nén payload giảm 60-85% kích thước lưu trữ', icon: Cpu, color: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'encryption', name: 'AES-256-GCM Encryption', desc: 'Mã hóa quân sự với IV 96-bit & Auth Tag 128-bit', icon: Lock, color: 'text-purple-400', border: 'border-purple-500/30' }
];

const PRESETS = [
  { id: 'base_only', label: '1. Raw Base (Không Decorator)', layers: [] },
  { id: 'cached', label: '2. High-Speed Cache', layers: ['timing', 'cache'] },
  { id: 'secure', label: '3. Compliance Security', layers: ['timing', 'audit', 'compression', 'encryption'] },
  { id: 'full', label: '4. Full Enterprise Stack (6 Layers)', layers: ['timing', 'audit', 'rateLimit', 'cache', 'compression', 'encryption'] }
];

const SAMPLE_DOCS = [
  {
    id: 'DOC_FINANCE_Q3',
    title: 'Q3 Enterprise Financial Report',
    tenantId: 'tenant_goldman',
    content: JSON.stringify({
      reportId: 'REP_2026_Q3_99',
      revenueUsd: 145000000.00,
      netProfitUsd: 42300000.00,
      ebitdaMargin: '29.1%',
      breakdown: Array.from({ length: 25 }, (_, i) => ({
        unit: `Business Unit ${i + 1}`,
        costCenter: `CC_${1000 + i}`,
        allocatedBudget: 1200000,
        utilized: 980000 + Math.floor(Math.random() * 200000)
      }))
    }, null, 2)
  },
  {
    id: 'DOC_HEALTHCARE_EHR',
    title: 'Patient Electronic Health Record (EHR)',
    tenantId: 'tenant_mayo_clinic',
    content: JSON.stringify({
      patientId: 'PAT_9928172',
      ssnEncrypted: 'XXX-XX-8821',
      diagnosis: 'Acute Coronary Syndrome, Hypertension Grade 2',
      prescriptions: [
        { drug: 'Atorvastatin', dosage: '40mg daily', duration: '90 days' },
        { drug: 'Metoprolol Succinate', dosage: '50mg daily', duration: '90 days' },
        { drug: 'Aspirin', dosage: '81mg daily', duration: 'Continuous' }
      ],
      labVitals: Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        systolic: 125 + (i % 10),
        diastolic: 80 + (i % 5),
        heartRate: 72 + (i % 8)
      }))
    }, null, 2)
  }
];

export default function PipelineStudio({ onExecuteSuccess, onInspectContext }) {
  const [selectedLayers, setSelectedLayers] = useState(['timing', 'audit', 'rateLimit', 'cache', 'compression', 'encryption']);
  const [selectedDoc, setSelectedDoc] = useState(SAMPLE_DOCS[0]);
  const [customPayload, setCustomPayload] = useState(SAMPLE_DOCS[0].content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [errorFeedback, setErrorFeedback] = useState(null);

  function toggleLayer(layerId) {
    if (selectedLayers.includes(layerId)) {
      setSelectedLayers(selectedLayers.filter((l) => l !== layerId));
    } else {
      setSelectedLayers([...selectedLayers, layerId]);
    }
  }

  function handleSelectDoc(doc) {
    setSelectedDoc(doc);
    setCustomPayload(doc.content);
  }

  async function handleRunPipeline(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setExecutionResult(null);
    setErrorFeedback(null);

    const payload = {
      documentId: selectedDoc.id,
      tenantId: selectedDoc.tenantId,
      title: selectedDoc.title,
      payload: customPayload,
      layers: selectedLayers
    };

    try {
      const res = await api.processDocument(payload);
      setExecutionResult(res.data);
      if (onExecuteSuccess) onExecuteSuccess(res.data);
      if (onInspectContext) onInspectContext(res.data);
    } catch (err) {
      setErrorFeedback({
        message: err.message,
        status: err.status,
        data: err.data
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Pipeline Studio: Lắp Ráp Decorator Động Tại Runtime</span>
              <span className="badge badge-purple text-[10px]">Composition Over Inheritance</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Mã nguồn lõi <code className="text-purple-300 font-mono">BaseStorageService</code> chỉ chịu trách nhiệm ghi dữ liệu xuống đĩa. 
              Bạn có thể tự do <strong>bật/tắt bất kỳ Decorator nào</strong> bên dưới: Decorator bọc bên ngoài sẽ can thiệp vào dữ liệu, 
              nén dung lượng, mã hóa AES hoặc short-circuit trả về từ Redis Cache mà không cần sửa 1 dòng code của Base Component!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleRunPipeline} className="glass-panel p-6 space-y-6">
            {/* Quick Presets */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>1. Chọn Cấu Hình Mẫu (Pipeline Presets)</span>
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedLayers(p.layers)}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:border-purple-500/50 hover:bg-purple-950/20 text-xs font-medium text-slate-300 transition-all text-left"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Decorators */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>2. Bật / Tắt Các Lớp Decorator (Vỏ Bọc Củ Hành)</span>
              </label>

              <div className="space-y-2.5">
                {AVAILABLE_DECORATORS.map((dec) => {
                  const isActive = selectedLayers.includes(dec.id);
                  const Icon = dec.icon;
                  return (
                    <div
                      key={dec.id}
                      onClick={() => toggleLayer(dec.id)}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isActive
                          ? `bg-slate-850 shadow-md ${dec.border}`
                          : 'border-slate-800/80 bg-slate-900/40 opacity-50 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${dec.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-slate-200">{dec.name}</h4>
                            {isActive && <span className="badge badge-purple text-[9px]">WRAPPING</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{dec.desc}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => {}}
                        className="w-4 h-4 text-purple-600 rounded bg-slate-900 border-slate-700"
                      />
                    </div>
                  );
                })}

                {/* Core Component Indicator (Always Present) */}
                <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-emerald-200">BaseStorageService (Core Component)</h4>
                        <span className="badge badge-emerald text-[9px]">LÕI BẮT BUỘC</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Lưu trữ dữ liệu thô vào PostgreSQL / Đĩa cứng vật lý</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">INSIDE CORE</span>
                </div>
              </div>
            </div>

            {/* Document Selector & Editor */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Dữ Liệu Tài Liệu Đầu Vào (Payload)
                </label>
                <div className="flex space-x-2 text-xs">
                  {SAMPLE_DOCS.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDoc(doc)}
                      className={`px-2 py-0.5 rounded font-mono ${
                        selectedDoc.id === doc.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {doc.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={6}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isSubmitting
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white hover:brightness-110 shadow-purple-500/25 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang đi qua các lớp bọc Decorator...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Kích Hoạt Pipeline ({selectedLayers.length} Decorators + 1 Core)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Execution Output */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Kết Quả Thực Thi Pipeline</span>
              <span className="text-xs font-mono text-slate-500">Live Telemetry</span>
            </h3>

            {!executionResult && !errorFeedback && !isSubmitting && (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-400">
                  Bấm <strong>"Kích Hoạt Pipeline"</strong> để xem dữ liệu được bọc lồng và biến đổi qua từng Decorator.
                </p>
              </div>
            )}

            {isSubmitting && (
              <div className="p-8 text-center border border-purple-500/30 bg-purple-950/20 rounded-xl space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-purple-400 animate-spin" />
                <p className="text-sm font-semibold text-purple-200">
                  Đang bóc tách và thực thi chuỗi hàm đệ quy...
                </p>
              </div>
            )}

            {executionResult && (
              <div className="p-5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">PIPELINE THỰC THI THÀNH CÔNG</h4>
                    <p className="text-xs text-purple-300 font-mono">
                      {executionResult.activeDecorators?.length} Tầng Lồng Nhau • {executionResult.totalDurationMs}ms
                    </p>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500">Kích thước ban đầu:</span>
                    <p className="text-slate-200 font-bold">{executionResult.originalSizeBytes} Bytes</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Kích thước sau cùng:</span>
                    <p className="text-emerald-400 font-bold">{executionResult.finalSizeBytes} Bytes</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Tỷ lệ tiết kiệm:</span>
                    <p className="text-cyan-400 font-bold">{executionResult.compressionRatio}%</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Cache Status:</span>
                    <span className={`badge text-[9px] ${executionResult.cacheStatus === 'HIT' ? 'badge-emerald' : 'badge-amber'}`}>
                      {executionResult.cacheStatus}
                    </span>
                  </div>
                </div>

                {/* Payload Preview */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Dữ liệu lưu trữ thực tế (Final Payload)
                  </span>
                  <pre className="code-block text-[11px] max-h-32 overflow-y-auto">
                    {executionResult.finalPayload}
                  </pre>
                </div>

                <p className="text-xs text-slate-300">
                  💡 Xem chi tiết từng tầng bóc tách tại tab <strong>"Onion Skin Inspector"</strong>!
                </p>
              </div>
            )}

            {errorFeedback && (
              <div className="p-5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-4">
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-7 h-7 text-rose-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-rose-200 text-sm">DECORATOR CHẶN ĐỨNG (SHORT-CIRCUIT)</h4>
                    <p className="text-xs text-rose-400/80 font-mono">HTTP {errorFeedback.status}</p>
                  </div>
                </div>
                <p className="text-xs font-mono text-rose-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  {errorFeedback.message}
                </p>
                <p className="text-xs text-slate-300">
                  🎯 <strong>Chứng minh tính năng Short-circuiting</strong>: Khi một Decorator (như RateLimiter) gặp điều kiện dừng, 
                  nó ném ngoại lệ lập tức và không hề gọi các tầng bên trong!
                </p>
              </div>
            )}

            {/* Architectural note */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Nguyên Lý Decorator</span>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong className="text-slate-200">Giao diện không đổi:</strong> Caller chỉ gọi <code className="text-purple-300">pipeline.process(context)</code>.</li>
                <li><strong className="text-slate-200">Bảo vệ tính đóng gói:</strong> Base Component không bị ô nhiễm logic cache/nén.</li>
                <li><strong className="text-slate-200">Tháo lắp linh hoạt:</strong> Bật/tắt Decorator tự do tại thời điểm Runtime.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
