import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, CheckCircle, Zap, Shield, Play } from 'lucide-react';
import { api } from '../services/api';

export default function ChaosSimulator() {
  const [circuits, setCircuits] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [chaosLog, setChaosLog] = useState([]);

  async function fetchCircuitStatus() {
    try {
      const res = await api.getCircuitBreakerStatus();
      if (res.success) {
        setCircuits(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy trạng thái Circuit Breaker:', err);
    }
  }

  useEffect(() => {
    fetchCircuitStatus();
    const interval = setInterval(fetchCircuitStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  function addLog(msg, type = 'info') {
    setChaosLog((prev) => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 30)
    ]);
  }

  async function handleSimulateOutage(gatewayId) {
    setIsLoading(true);
    addLog(`Bắt đầu giả lập chuỗi lỗi liên tiếp (Cascading Outage) trên cổng: ${gatewayId}`, 'warn');

    // Bắn 3 request liên tiếp với simulateError=timeout để kích hoạt Circuit Breaker
    for (let i = 1; i <= 3; i++) {
      try {
        addLog(`[Lần ${i}/3] Gửi request timeout tới ${gatewayId}...`);
        await api.checkout({
          orderId: `CHAOS_ORD_${Date.now()}`,
          gatewayId,
          amount: 50,
          currency: 'USD',
          paymentMethodDetails: { simulateError: 'timeout' }
        });
      } catch (err) {
        addLog(`[Lần ${i}/3 Thất bại]: ${err.message}`, 'error');
      }
    }

    await fetchCircuitStatus();
    setIsLoading(false);
  }

  async function handleTestOpenCircuit(gatewayId) {
    try {
      addLog(`Thử gửi request thanh toán khi mạch cổng ${gatewayId} đang bị ngắt...`);
      const res = await api.checkout({
        orderId: `TEST_ORD_${Date.now()}`,
        gatewayId,
        amount: 50,
        currency: 'USD'
      });
      addLog(`Thành công bất ngờ: ${res.data?.status}`, 'success');
    } catch (err) {
      addLog(`[FAST-FAIL KÍCH HOẠT]: Request bị chặn ngay lập tức mà không cần chờ 3s: ${err.message}`, 'error');
    }
    await fetchCircuitStatus();
  }

  async function handleResetCircuit(gatewayId) {
    try {
      await api.resetCircuit(gatewayId);
      addLog(`Đã khôi phục (Reset) mạch cổng ${gatewayId} về trạng thái CLOSED`, 'success');
      await fetchCircuitStatus();
    } catch (err) {
      addLog(`Lỗi reset: ${err.message}`, 'error');
    }
  }

  const gatewayList = ['stripe', 'paypal', 'vnpay', 'legacy_bank_xml'];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-amber-950/40">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Chaos Engineering & Circuit Breaker Dashboard</span>
              <span className="badge badge-failed text-[10px]">Production Resilience</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Trong kiến trúc Adapter, nếu một dịch vụ bên thứ 3 bị sập hoặc nghẽn mạng, 
              <strong>Circuit Breaker</strong> sẽ tự động ngắt kết nối (OPEN state) để tránh tình trạng treo thread/connection pool, 
              bảo vệ toàn bộ các Adapter khác và hệ thống Core!
            </p>
          </div>
        </div>
      </div>

      {/* Circuit Cards for Each Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {gatewayList.map((gwId) => {
          const circuit = circuits[gwId] || { state: 'CLOSED', failureCount: 0 };
          const isOpen = circuit.state === 'OPEN';
          const isHalfOpen = circuit.state === 'HALF_OPEN';

          return (
            <div
              key={gwId}
              className={`glass-panel p-5 space-y-4 border transition-all ${
                isOpen
                  ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-500/10'
                  : isHalfOpen
                  ? 'border-amber-500/60 bg-amber-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm text-slate-200 uppercase">{gwId}</span>
                <span
                  className={`badge text-[10px] ${
                    isOpen ? 'badge-failed' : isHalfOpen ? 'badge-pending' : 'badge-success'
                  }`}
                >
                  {circuit.state}
                </span>
              </div>

              <div className="space-y-1 text-xs font-mono text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                <div className="flex justify-between">
                  <span>Số lần lỗi:</span>
                  <span className={circuit.failureCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                    {circuit.failureCount} / 3
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cooldown:</span>
                  <span className="text-slate-300">15s</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleSimulateOutage(gwId)}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Bắn 3 Request Lỗi Timeout</span>
                </button>

                {isOpen && (
                  <button
                    onClick={() => handleTestOpenCircuit(gwId)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Test Fast-Fail Khi Mạch Ngắt</span>
                  </button>
                )}

                <button
                  onClick={() => handleResetCircuit(gwId)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Khôi phục (Reset Closed)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Chaos Console Logs */}
      <div className="glass-panel p-5 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Chaos Event Stream & Circuit Breaker Logs</span>
          </h3>
          <button
            onClick={() => setChaosLog([])}
            className="text-xs text-slate-500 hover:text-slate-300 font-mono"
          >
            Clear logs
          </button>
        </div>

        <div className="code-block h-64 overflow-y-auto space-y-1.5 text-xs">
          {chaosLog.length === 0 ? (
            <div className="text-slate-600 italic">Chưa có sự kiện nào. Hãy bấm "Bắn 3 Request Lỗi" ở trên để kích hoạt ngắt mạch!</div>
          ) : (
            chaosLog.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 font-mono">
                <span className="text-slate-500 flex-shrink-0">[{log.time}]</span>
                <span
                  className={
                    log.type === 'error'
                      ? 'text-rose-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }
                >
                  {log.msg}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
