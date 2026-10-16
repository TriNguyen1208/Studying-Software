import React from 'react';
import { Layers, ArrowRight, RefreshCw, Skull, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function TopologyOverview({ stats }) {
  const mainCount = stats?.main?.messageCount || 0;
  const retryCount = stats?.retry?.messageCount || 0;
  const dlqCount = stats?.dlq?.registeredCount ?? stats?.dlq?.messageCount ?? 0;

  return (
    <div className="glass-panel p-6 mb-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-indigo-400" />
            Kiến Trúc AMQP & Topology Luồng Xử Lý
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Minh họa luồng phân luồng tin nhắn: Main Queue ➔ Retry Queue (TTL 5s) ➔ Dead Letter Queue (DLQ).
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-indigo">Direct Exchanges</span>
          <span className="badge badge-emerald">Manual ACK/NACK</span>
          <span className="badge badge-rose">DLX Enabled</span>
        </div>
      </div>

      {/* Topology Diagram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Step 1: Main Queue */}
        <div className="glass-panel p-5 border border-indigo-500/20 bg-indigo-950/20 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              1. Main Pipeline
            </span>
            <span className={`badge ${mainCount > 0 ? 'badge-amber animate-pulse' : 'badge-emerald'}`}>
              {mainCount} đang chờ
            </span>
          </div>
          <h3 className="text-base font-bold text-white mb-1">orders.main.q</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Tiếp nhận đơn hàng mới từ Exchange <code className="text-indigo-300">orders.direct</code>. Worker tiêu thụ với Prefetch = 1.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1">
            <div className="text-slate-300 font-semibold">Argument Cấu Hình DLX:</div>
            <div>x-dead-letter-exchange: <span className="text-rose-400">orders.dlx</span></div>
            <div>x-dead-letter-routing-key: <span className="text-rose-400">orders.dead</span></div>
          </div>
        </div>

        {/* Step 2: Retry Queue */}
        <div className="glass-panel p-5 border border-amber-500/20 bg-amber-950/20 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              2. Delayed Retry Queue
            </span>
            <span className={`badge ${retryCount > 0 ? 'badge-amber animate-pulse' : 'badge-emerald'}`}>
              {retryCount} đang đếm lùi
            </span>
          </div>
          <h3 className="text-base font-bold text-white mb-1">orders.retry.q</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Hứng lỗi tạm thời (Transient). Giữ message trong 5s (TTL). Hết TTL sẽ tự động DLX trả ngược về Main Queue!
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1">
            <div className="text-amber-300 font-semibold">Cơ Chế Trì Hoãn TTL:</div>
            <div>x-message-ttl: <span className="text-amber-400">5000ms</span></div>
            <div>DLX 回 Main: <span className="text-emerald-400">orders.direct</span></div>
          </div>
        </div>

        {/* Step 3: DLQ */}
        <div className={`glass-panel p-5 border rounded-xl relative overflow-hidden ${
          dlqCount > 0 
            ? 'border-rose-500/40 bg-rose-950/30 pulse-danger' 
            : 'border-slate-800 bg-slate-900/30'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Skull className="w-4 h-4 text-rose-400" />
              3. Dead Letter Queue
            </span>
            <span className={`badge ${dlqCount > 0 ? 'badge-rose' : 'badge-emerald'}`}>
              {dlqCount} tin nhắn chết
            </span>
          </div>
          <h3 className="text-base font-bold text-rose-300 mb-1">orders.dlq</h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Nơi cô lập tin nhắn độc hại (Poison Pill) hoặc vượt quá 3 lần retry. Không bao giờ làm nghẽn hệ thống chính.
          </p>
          <div className="text-[11px] font-mono text-slate-400 bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1">
            <div className="text-rose-300 font-semibold">Trích xuất Giấy Chứng Tử:</div>
            <div>Header: <span className="text-rose-400">x-death[0].reason</span></div>
            <div>Quyền năng: <span className="text-cyan-400">Fix & Redrive Replay</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
