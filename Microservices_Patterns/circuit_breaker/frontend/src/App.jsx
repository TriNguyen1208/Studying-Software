import React, { useState, useEffect } from 'react';
import { 
  Zap, AlertOctagon, CheckCircle2, RefreshCw, 
  Flame, Server, ArrowRight, ShieldCheck, Activity, Terminal
} from 'lucide-react';

export default function App() {
  const [breakerData, setBreakerData] = useState({
    state: 'CLOSED',
    stats: { failures: 0, successes: 0, fallbacks: 0, rejects: 0, latencyMean: 0 },
    recentEvents: []
  });

  const [downstreamMode, setDownstreamMode] = useState('HEALTHY');
  const [requestLog, setRequestLog] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Poll trạng thái Circuit Breaker mỗi 1000ms
  const pollBreaker = async () => {
    try {
      const res = await fetch('/api/breaker-status');
      if (res.ok) {
        const data = await res.json();
        setBreakerData(data);
      }
    } catch (err) {
      console.warn('Poll status error:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(pollBreaker, 1000);
    pollBreaker();
    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------------------------------------------
  // GỬI REQUEST THANH TOÁN QUA GATEWAY
  // ----------------------------------------------------------------------------
  const sendCheckout = async (count = 1) => {
    setIsSending(true);
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: 'ORD-' + Math.floor(Math.random() * 1000), amount: 150 })
        });
        const data = await res.json();
        const dur = Math.round(performance.now() - start);

        const newLog = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          isFallback: data.isFallback || false,
          status: res.status,
          message: data.message || 'Thành công',
          latency: dur,
          breakerState: data.breakerState
        };

        setRequestLog(prev => [newLog, ...prev.slice(0, 19)]);
      } catch (err) {
        const dur = Math.round(performance.now() - start);
        const newLog = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString(),
          isFallback: true,
          status: 503,
          message: err.message,
          latency: dur,
          breakerState: 'UNKNOWN'
        };
        setRequestLog(prev => [newLog, ...prev.slice(0, 19)]);
      }
      if (count > 1) await new Promise(r => setTimeout(r, 150));
    }
    setIsSending(false);
    pollBreaker();
  };

  // ----------------------------------------------------------------------------
  // ĐỔI CHẾ ĐỘ CỦA DOWNSTREAM SERVICE
  // ----------------------------------------------------------------------------
  const toggleDownstreamMode = async (mode) => {
    try {
      await fetch('/downstream/api/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      setDownstreamMode(mode);
    } catch (err) {
      console.error('Failed to change downstream mode:', err);
    }
  };

  const stateColor = breakerData.state === 'CLOSED' ? '#00e676' : breakerData.state === 'HALF-OPEN' ? '#ffd740' : '#ff1744';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: `linear-gradient(135deg, ${stateColor}, #00b0ff)`, padding: '10px', borderRadius: '12px', boxShadow: `0 0 20px ${stateColor}66` }}>
              <Zap size={28} color="#000" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #00e5ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Circuit Breaker Resilience Pattern Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Bảo Vệ Hạ Tầng Microservices, Chống Sập Dây Chuyền & Graceful Degradation (Opossum)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={breakerData.state === 'CLOSED' ? 'badge badge-closed' : breakerData.state === 'HALF-OPEN' ? 'badge badge-half' : 'badge badge-open'}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stateColor, display: 'inline-block' }}></span>
              CIRCUIT {breakerData.state}
            </span>
          </div>
        </div>

        {/* METRICS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>THÀNH CÔNG (CLOSED)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00e676' }}>{breakerData.stats.successes}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>THẤT BẠI (FAILURES)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff5252' }}>{breakerData.stats.failures}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>KÍCH HOẠT FALLBACK</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffd740' }}>{breakerData.stats.fallbacks}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TỪ CHỐI TỨC THÌ (REJECTED)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{breakerData.stats.rejects}</div>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* DOWNSTREAM SERVICE CHAOS CONTROL */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--accent-cyan)" />
            Cổng Downstream Payment Service (Port 3004)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Chủ động can thiệp sức khỏe của Downstream Service để kiểm chứng phản ứng của Circuit Breaker.
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            <button
              onClick={() => toggleDownstreamMode('HEALTHY')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: downstreamMode === 'HEALTHY' ? '1px solid #00e676' : '1px solid var(--border-color)',
                background: downstreamMode === 'HEALTHY' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.03)',
                color: downstreamMode === 'HEALTHY' ? '#00e676' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              ✅ 1. KHỎE MẠNH (HEALTHY - 50ms)
            </button>

            <button
              onClick={() => toggleDownstreamMode('ERROR_500')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: downstreamMode === 'ERROR_500' ? '1px solid #ff1744' : '1px solid var(--border-color)',
                background: downstreamMode === 'ERROR_500' ? 'rgba(255, 23, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                color: downstreamMode === 'ERROR_500' ? '#ff5252' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              💥 2. SẬP NGUỒN (ERROR 500 - Sập ngay lập tức)
            </button>

            <button
              onClick={() => toggleDownstreamMode('SLOW_TIMEOUT')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: downstreamMode === 'SLOW_TIMEOUT' ? '1px solid #ffd740' : '1px solid var(--border-color)',
                background: downstreamMode === 'SLOW_TIMEOUT' ? 'rgba(255, 215, 64, 0.15)' : 'rgba(255,255,255,0.03)',
                color: downstreamMode === 'SLOW_TIMEOUT' ? '#ffd740' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🐢 3. NGHẼN MẠNG (TIMEOUT 5s - Chậm chạp)
            </button>
          </div>
        </div>

        {/* TRAFFIC GENERATOR CONTROLS */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            Điều Phối Lưu Lượng Truy Cập (Traffic Dispatcher)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Gửi yêu cầu thanh toán qua Gateway. Khi cầu dao OPEN, bạn sẽ nhận được Fallback ngay trong 0ms!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => sendCheckout(1)}
              disabled={isSending}
              className="btn-primary"
            >
              <ArrowRight size={16} />
              Gửi 1 Request Thanh Toán
            </button>

            <button
              onClick={() => sendCheckout(6)}
              disabled={isSending}
              className="btn-danger"
            >
              <Flame size={16} />
              Bắn Dồn 6 Requests (Kích Hoạt Nhảy Cầu Dao)
            </button>
          </div>
        </div>
      </div>

      {/* REQUEST LOG STREAM */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} color="var(--accent-cyan)" />
          Nhật Ký Phản Hồi Thời Gian Thực (Gateway Latency Stream)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                <th style={{ padding: '10px 12px' }}>Trạng Thái Mạch</th>
                <th style={{ padding: '10px 12px' }}>Loại Phản Hồi</th>
                <th style={{ padding: '10px 12px' }}>Thông Điệp Nhận Được</th>
                <th style={{ padding: '10px 12px' }}>Độ Trễ</th>
              </tr>
            </thead>
            <tbody>
              {requestLog.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Chưa có request nào. Hãy nhấn nút gửi bên trên để bắt đầu!
                  </td>
                </tr>
              ) : (
                requestLog.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{log.time}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={log.breakerState === 'CLOSED' ? 'badge badge-closed' : log.breakerState === 'HALF-OPEN' ? 'badge badge-half' : 'badge badge-open'}>
                        {log.breakerState}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {log.isFallback ? (
                        <span style={{ color: '#ffd740', fontWeight: 700 }}>⚠️ GRACEFUL FALLBACK (COD)</span>
                      ) : (
                        <span style={{ color: '#00e676', fontWeight: 700 }}>✅ NORMAL SUCCESS</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-main)' }}>{log.message}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: log.latency <= 10 ? '#00e676' : log.latency > 1000 ? '#ff5252' : 'var(--accent-cyan)' }}>
                      {log.latency}ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
