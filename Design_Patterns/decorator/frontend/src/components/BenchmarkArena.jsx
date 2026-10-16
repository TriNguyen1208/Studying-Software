import React, { useState } from 'react';
import { Flame, Play, RefreshCw, Trash2, Zap, BarChart2, ShieldCheck, Database } from 'lucide-react';
import { api } from '../services/api';

export default function BenchmarkArena() {
  const [iterations, setIterations] = useState(30);
  const [payloadSizeKb, setPayloadSizeKb] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [feedback, setFeedback] = useState(null);

  async function handleRunBenchmark() {
    setIsRunning(true);
    setFeedback(null);
    try {
      const res = await api.runBenchmark(iterations, payloadSizeKb);
      if (res.success) {
        setResults(res.data);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleClearCache() {
    try {
      await api.clearCache();
      setFeedback({ type: 'success', message: 'Đã xóa sạch bộ đệm Redis/Memory Cache để test Cold Cache!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-purple-500/30 bg-gradient-to-r from-pink-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Benchmark Arena: Khảo Sát Hiệu Năng Đa Tầng</span>
              <span className="badge badge-rose text-[10px]">P95 Latency & Throughput</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Kiểm chứng sự đánh đổi (Trade-offs) thực tế khi bọc thêm Decorator: 
              Mã hóa & Nén tốn thêm bao nhiêu chu kỳ CPU? Cache Decorator giúp giảm latency từ 20ms xuống 0.8ms thế nào?
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Benchmark Controls */}
      <div className="glass-panel p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Số lượt thử nghiệm mỗi cấu hình:
            </label>
            <select
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value={20}>20 lần (Nhanh)</option>
              <option value={50}>50 lần (Khuyên dùng)</option>
              <option value={100}>100 lần (Độ chính xác cao)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Kích thước Payload mẫu:
            </label>
            <select
              value={payloadSizeKb}
              onChange={(e) => setPayloadSizeKb(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value={2}>2 KB (Tài liệu nhỏ)</option>
              <option value={5}>5 KB (Báo cáo tiêu chuẩn)</option>
              <option value={20}>20 KB (Báo cáo lớn / Batch)</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                isRunning
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 shadow-lg shadow-purple-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Benchmark...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt Đầu Benchmark</span>
                </>
              )}
            </button>

            <button
              onClick={handleClearCache}
              title="Xóa Redis Cache để đo Cold Cache"
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa Cache</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Table & Charts */}
      {results && (
        <div className="glass-panel p-5 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span>Kết Quả Đo Lường Chi Tiết ({iterations} lần lặp)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-sans font-bold">Cấu Hình Pipeline</th>
                  <th className="py-3 px-4 text-amber-400">Avg Latency</th>
                  <th className="py-3 px-4 text-rose-400">P95 Latency</th>
                  <th className="py-3 px-4 text-slate-300">Min / Max</th>
                  <th className="py-3 px-4 text-emerald-400">Dung Lượng Lưu Trữ</th>
                  <th className="py-3 px-4 text-cyan-400">Cache Hit Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((row) => (
                  <tr key={row.presetId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                      {row.name}
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {row.layers.length > 0 ? row.layers.join(' ➔ ') : 'Không Decorator'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-300">{row.avgLatencyMs}ms</td>
                    <td className="py-3 px-4 font-bold text-rose-300">{row.p95LatencyMs}ms</td>
                    <td className="py-3 px-4 text-slate-400">{row.minLatencyMs}ms / {row.maxLatencyMs}ms</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-300 font-bold">{row.finalSizeBytes} B</span>
                      {row.savingsPercent > 0 && (
                        <span className="text-[10px] text-emerald-400 ml-1.5 font-bold">
                          (-{row.savingsPercent}%)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-cyan-300 font-bold">{row.cacheHitRatio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual Latency Bar Comparison */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase">Trực Quan Hóa P95 Latency:</h4>
            {results.map((row) => {
              const maxP95 = Math.max(...results.map((r) => r.p95LatencyMs), 1);
              const pct = Math.max(5, (row.p95LatencyMs / maxP95) * 100);
              return (
                <div key={row.presetId} className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-300">{row.name}</span>
                    <span className="text-rose-400 font-bold">{row.p95LatencyMs}ms</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
