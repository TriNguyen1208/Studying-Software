import React, { useState, useEffect } from 'react';

export default function MetricsTab({ apiUrl }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/inspector/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const timer = setInterval(fetchMetrics, 5000);
    return () => clearInterval(timer);
  }, [apiUrl]);

  if (!metrics) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Đang tải dữ liệu telemetry từ Redis Server (lệnh INFO)...
      </div>
    );
  }

  const fragRatio = metrics.memory?.fragmentationRatio || 1.0;
  const isFragHealthy = fragRatio >= 1.0 && fragRatio <= 1.5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with quick reload */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              📊 Giám Sát Chỉ Số Động Cơ Redis (Engine Internals & Telemetry)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Trích xuất trực tiếp từ câu lệnh <code className="font-mono">INFO</code> của Redis Server mỗi 5 giây.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge badge-blue">Redis v{metrics.version}</span>
            <button className="btn-secondary" onClick={fetchMetrics} disabled={loading}>
              {loading ? 'Đang đọc...' : '🔄 Làm Mới'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* RAM Usage */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>BỘ NHỚ SỬ DỤNG (DATA RAM)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            {metrics.memory?.usedHuman}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            RSS: {metrics.memory?.usedRssHuman} | Max: {metrics.memory?.maxmemoryHuman}
          </div>
        </div>

        {/* Fragmentation Ratio */}
        <div className="glass-card" style={{ padding: '20px', borderColor: isFragHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)' }}>
          <div style={{ color: isFragHealthy ? '#34d399' : '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>TỶ LỆ PHÂN MẢNH (FRAG RATIO)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isFragHealthy ? '#34d399' : '#fbbf24', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            {fragRatio}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {isFragHealthy ? '✅ Trạng thái cấp phát RAM tối ưu' : '⚠️ Cảnh báo phân mảnh bộ nhớ'}
          </div>
        </div>

        {/* Ops / Sec */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>LỆNH XỬ LÝ / GIÂY (OPS/SEC)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fcd34d', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            {metrics.performance?.opsPerSec}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Tổng lệnh: {metrics.performance?.totalCommands.toLocaleString()}
          </div>
        </div>

        {/* Connected Clients */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>CLIENTS KẾT NỐI (TCP SOCKETS)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            {metrics.clients?.connected}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Blocked clients: {metrics.clients?.blocked}
          </div>
        </div>
      </div>

      {/* Database Keys Inspector */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Danh Sách Keys Trong DB 0 (Tổng: {metrics.totalKeys} keys)
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            AOF Persistence: {metrics.persistence?.aofEnabled ? 'BẬT' : 'TẮT'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {metrics.sampleKeys?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Database hiện đang trống. Hãy thực hiện các thao tác ở các tab khác!
            </div>
          ) : (
            metrics.sampleKeys?.map((item) => (
              <div 
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>
                    {item.key}
                  </span>
                </div>

                <div style={{ color: item.ttl > 0 ? '#6ee7b7' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  TTL: {item.ttl === -1 ? 'Vĩnh cửu (No TTL)' : item.ttl === -2 ? 'Key không tồn tại' : `${item.ttl}s`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
