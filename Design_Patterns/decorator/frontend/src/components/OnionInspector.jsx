import React from 'react';
import { Activity, ArrowDown, ArrowUp, Clock, ShieldCheck, Zap, Lock, Cpu, Database, Flame, CheckCircle2 } from 'lucide-react';

export default function OnionInspector({ lastResult }) {
  const traces = lastResult?.traceLogs || [];
  const layers = lastResult?.activeDecorators || ['BaseStorageService'];

  function getLayerIcon(name) {
    if (name.includes('Timing')) return <Clock className="w-4 h-4 text-amber-400" />;
    if (name.includes('Audit')) return <ShieldCheck className="w-4 h-4 text-blue-400" />;
    if (name.includes('RateLimit')) return <Flame className="w-4 h-4 text-rose-400" />;
    if (name.includes('Cache')) return <Zap className="w-4 h-4 text-cyan-400" />;
    if (name.includes('Compression')) return <Cpu className="w-4 h-4 text-emerald-400" />;
    if (name.includes('Encryption')) return <Lock className="w-4 h-4 text-purple-400" />;
    return <Database className="w-4 h-4 text-indigo-400" />;
  }

  function getPhaseBadge(phase) {
    switch (phase) {
      case 'BEFORE':
        return <span className="badge badge-purple text-[9px]"><ArrowDown className="w-3 h-3 mr-1" /> PRE-PROCESS</span>;
      case 'AFTER':
        return <span className="badge badge-cyan text-[9px]"><ArrowUp className="w-3 h-3 mr-1" /> POST-PROCESS (UNWIND)</span>;
      case 'INTERCEPT':
        return <span className="badge badge-amber text-[9px] font-bold">⚡ SHORT-CIRCUIT</span>;
      case 'EXECUTE':
        return <span className="badge badge-emerald text-[9px]">CORE PERSISTENCE</span>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-purple-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Onion Skin Inspector: Cơ Chế Bóc Vỏ Củ Hành & Xả Ngăn Xếp</span>
              <span className="badge badge-purple text-[10px]">Call Stack Unwinding</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Minh họa hành trình thực thi: Request đi từ <strong>Lớp Vỏ Ngoài Cùng (Outer Layer)</strong> đi sâu dần vào trong 
              cho đến khi chạm <strong>Lõi Cơ Sở (Core Component)</strong>, sau đó đảo ngược dòng chảy (Call Stack Unwinding) 
              để các Decorator thực hiện các tác vụ hậu xử lý (Post-processing) trước khi trả về cho Client!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Onion Concentric Visualizer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 space-y-4 border-purple-500/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Cấu Trúc Các Tầng Lồng Nhau (Concentric Stack)
            </h3>

            <div className="space-y-2 font-mono text-xs">
              {layers.map((layerName, idx) => {
                const isCore = layerName.includes('BaseStorage');
                return (
                  <div
                    key={idx}
                    style={{ marginLeft: `${idx * 12}px` }}
                    className={`p-2.5 rounded-lg border flex items-center space-x-2.5 transition-all ${
                      isCore
                        ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200 font-bold shadow-md shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      {idx + 1}
                    </span>
                    {getLayerIcon(layerName)}
                    <span className="truncate">{layerName}</span>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">Đặc điểm Call Stack:</p>
              <p>Mỗi Decorator chiếm 1 Stack Frame trên Call Stack. Khi gọi <code className="text-purple-300">await wrappee.process()</code>, CPU tạm dừng frame hiện tại để nạp frame của tầng tiếp theo.</p>
            </div>
          </div>
        </div>

        {/* Right: Step-by-Step Execution Trace Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel p-5 space-y-4 border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <span>Dòng Chảy Xuyên Suốt (Timeline Traces)</span>
                <span className="text-slate-500 font-mono">({traces.length} Sự Kiện Ghi Nhận)</span>
              </h3>
              {lastResult && (
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Total: {lastResult.totalDurationMs}ms
                </span>
              )}
            </div>

            {traces.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic text-xs">
                Chưa có dữ liệu trace. Hãy quay lại tab <strong>"Pipeline Studio"</strong> và bấm <strong>"Kích Hoạt Pipeline"</strong>.
              </div>
            ) : (
              <div className="space-y-3">
                {traces.map((trace) => (
                  <div
                    key={trace.step}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-purple-900/50 text-purple-300 text-[10px] font-mono font-bold flex items-center justify-center">
                          {trace.step}
                        </span>
                        {getLayerIcon(trace.layer)}
                        <span className="font-bold text-sm text-slate-200">{trace.layer}</span>
                      </div>
                      {getPhaseBadge(trace.phase)}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{trace.detail}</p>

                    {trace.payloadPreview && (
                      <pre className="code-block text-[10px] max-h-24 overflow-y-auto">
                        {trace.payloadPreview}
                      </pre>
                    )}

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Dung lượng hiện tại: <strong className="text-slate-300">{trace.payloadSize} Bytes</strong></span>
                      {trace.durationMs > 0 && (
                        <span className="text-amber-400 font-semibold">{trace.durationMs}ms</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
