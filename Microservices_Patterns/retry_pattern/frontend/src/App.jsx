import React, { useState } from 'react';
import { 
  RefreshCw, CheckCircle2, XCircle, Clock, ShieldCheck, 
  ArrowRight, Flame, AlertTriangle, Key, Terminal, Zap
} from 'lucide-react';

export default function App() {
  const [strategy, setStrategy] = useState('FULL_JITTER');
  const [maxRetries, setMaxRetries] = useState(3);
  const [currentExecution, setCurrentExecution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const runRequest = async (isInvalid = false) => {
    setIsLoading(true);
    const txnId = 'TXN-' + Math.floor(Math.random() * 100000);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/order-with-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          maxRetries,
          isInvalidRequest: isInvalid,
          idempotencyKey: txnId
        })
      });

      const data = await res.json();
      const totalDur = Math.round(performance.now() - startTime);

      const executionRecord = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        txnId,
        strategy,
        success: data.success,
        finalStatus: data.finalStatus,
        attemptsCount: data.attemptsCount,
        totalDurationMs: totalDur,
        telemetry: data.telemetry || []
      };

      setCurrentExecution(executionRecord);
      setHistory(prev => [executionRecord, ...prev.slice(0, 9)]);
    } catch (err) {
      console.error('Request failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #00e5ff, #7c4dff)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' }}>
              <RefreshCw size={28} color="#000" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #00e5ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Retry Pattern & Exponential Backoff Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Khắc Phục Lỗi Mạng Tạm Thời (Transient Faults), AWS Full Jitter & Bảo Đảm Tính Bất Biến Idempotency
              </p>
            </div>
          </div>

          <span className="badge badge-cyan">
            AWS Full Jitter Engine Active
          </span>
        </div>
      </header>

      {/* STRATEGY CONFIGURATION GRID */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
          Chọn Chiến Lược Thời Gian Chờ (Backoff Strategy)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { id: 'NO_RETRY', label: '1. Không Thử Lại (No Retry)', desc: 'Thất bại ngay lập tức khi gặp lỗi đầu tiên.' },
            { id: 'FIXED', label: '2. Cố Định (Fixed Delay)', desc: 'Chờ cố định 400ms sau mỗi lần thử.' },
            { id: 'EXPONENTIAL', label: '3. Hàm Mũ (Exponential)', desc: 'Nhân đôi thời gian chờ: 400ms, 800ms, 1600ms...' },
            { id: 'FULL_JITTER', label: '4. AWS Full Jitter (Khuyên Dùng)', desc: 'Hàm mũ kết hợp độ lệch ngẫu nhiên triệt tiêu bão traffic.' }
          ].map(s => (
            <div
              key={s.id}
              onClick={() => setStrategy(s.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: strategy === s.id ? '1px solid #00e5ff' : '1px solid var(--border-color)',
                background: strategy === s.id ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: strategy === s.id ? '#00e5ff' : '#fff', marginBottom: '4px' }}>
                {s.label}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => runRequest(false)}
            disabled={isLoading}
            className="btn-primary"
          >
            <Zap size={16} />
            {isLoading ? 'Đang thử lại trong nền...' : 'Gửi Giao Dịch (Giả Lập Lỗi Tạm Thời 503)'}
          </button>

          <button
            onClick={() => runRequest(true)}
            disabled={isLoading}
            className="btn-secondary"
            style={{ color: '#ff5252', borderColor: 'rgba(255,23,68,0.3)' }}
          >
            <AlertTriangle size={16} />
            Gửi Lỗi Nghiệp Vụ (400 Bad Request - Dừng Ngay)
          </button>
        </div>
      </div>

      {/* TIMELINE VISUALIZER OF CURRENT EXECUTION */}
      {currentExecution && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                Dòng Thời Gian Thử Lại (Execution Timeline)
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Idempotency-Key: <strong style={{ color: 'var(--accent-cyan)' }}>{currentExecution.txnId}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={currentExecution.success ? 'badge badge-green' : 'badge badge-red'}>
                {currentExecution.success ? 'KẾT QUẢ: THÀNH CÔNG RỰC RỠ' : 'KẾT QUẢ: THẤT BẠI'}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Tổng thời gian: <strong style={{ color: '#fff' }}>{currentExecution.totalDurationMs}ms</strong>
              </span>
            </div>
          </div>

          {/* VISUAL STEPS */}
          <div style={{ display: 'grid', gap: '14px' }}>
            {currentExecution.telemetry.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: step.success ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)',
                  border: step.success ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid rgba(255, 23, 68, 0.3)'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step.success ? '#00e676' : '#ff5252', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                  #{step.attemptNumber}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <strong style={{ color: step.success ? '#00e676' : '#ff5252' }}>
                      HTTP {step.status} {step.success ? 'OK' : 'Error'}
                    </strong>
                    {step.delayBeforeMs > 0 && (
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                        <Clock size={12} /> Chờ {step.delayBeforeMs}ms trước khi thử lại
                      </span>
                    )}
                    {step.stoppedReason && (
                      <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                        {step.stoppedReason}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {step.message || step.error}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT EXECUTIONS HISTORY */}
      {history.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-cyan)" />
            Lịch Sử Các Giao Dịch Gần Nhất
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                  <th style={{ padding: '10px 12px' }}>Transaction ID</th>
                  <th style={{ padding: '10px 12px' }}>Chiến Lược</th>
                  <th style={{ padding: '10px 12px' }}>Số Lần Thử</th>
                  <th style={{ padding: '10px 12px' }}>Kết Quả</th>
                  <th style={{ padding: '10px 12px' }}>Tổng Thời Gian</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{item.time}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{item.txnId}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.strategy}</td>
                    <td style={{ padding: '10px 12px' }}>{item.attemptsCount} lần</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={item.success ? 'badge badge-green' : 'badge badge-red'}>
                        {item.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{item.totalDurationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
