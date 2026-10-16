import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Clock, Database, Layers } from 'lucide-react';
import { api } from '../services/api';

export default function AuditTrail({ refreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadAuditLogs() {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs(30);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Lỗi nạp nhật ký kiểm toán:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, [refreshTrigger]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-purple-500/30 bg-gradient-to-r from-emerald-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Sổ Cái Kiểm Toán Bất Biến (Cryptographic Audit Trail)</span>
              <span className="badge badge-emerald text-[10px]">Tamper-Evident</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Toàn bộ các tài liệu đi qua <code className="text-emerald-300 font-mono">AuditLogDecorator</code> đều được ghi nhận dấu vết 
              vào bảng <code className="text-emerald-300 font-mono">pipeline_audit_logs</code>, phục vụ thanh tra an ninh mạng và xác thực tính toàn vẹn dữ liệu.
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Danh Sách Nhật Ký Gần Nhất ({logs.length} Bản Ghi)
          </h3>
          <button
            onClick={loadAuditLogs}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Tải Lại</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Document ID</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Pipeline Layers Stack</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Cache</th>
                <th className="py-3 px-4">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-sans italic">
                    Chưa có bản ghi kiểm toán nào.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const stack = typeof log.pipeline_stack === 'string' ? JSON.parse(log.pipeline_stack) : log.pipeline_stack || [];
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-purple-300 font-bold">{log.id}</td>
                      <td className="py-3 px-4 text-slate-200">{log.document_id}</td>
                      <td className="py-3 px-4 text-slate-400">{log.tenant_id}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {stack.map((layer, idx) => (
                            <span key={idx} className="badge badge-purple text-[8px]">
                              {layer.replace('Decorator', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{log.total_latency_ms}ms</td>
                      <td className="py-3 px-4">
                        <span className={`badge text-[9px] ${log.cache_status === 'HIT' ? 'badge-emerald' : 'badge-amber'}`}>
                          {log.cache_status || 'MISS'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
