import React, { useState, useEffect } from 'react';

export default function CacheBenchmarkTab({ apiUrl }) {
  const [selectedProduct, setSelectedProduct] = useState('prod_1');
  const [loading, setLoading] = useState(false);
  const [queryLog, setQueryLog] = useState([]);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, totalQueries: 0, hitRatio: '0.0%' });
  const [useMutex, setUseMutex] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/cache/stats`);
      const data = await res.json();
      setCacheStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [apiUrl]);

  const handleQuery = async (idToQuery = selectedProduct) => {
    setLoading(true);
    const endpoint = useMutex 
      ? `${apiUrl}/api/cache/product/${idToQuery}/mutex`
      : `${apiUrl}/api/cache/product/${idToQuery}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      const logItem = {
        id: Date.now(),
        productId: idToQuery,
        source: data.source,
        latencyMs: data.latencyMs,
        message: data.message || data.protectionMechanism,
        productName: data.data?.name || (idToQuery === 'prod_invalid' ? 'Không tồn tại (Invalid)' : 'Dữ liệu'),
        timestamp: new Date().toLocaleTimeString(),
      };

      setQueryLog((prev) => [logItem, ...prev.slice(0, 19)]);
      if (data.cacheStats) {
        setCacheStats({
          ...data.cacheStats,
          hitRatio: data.cacheStats.totalQueries > 0 
            ? `${((data.cacheStats.hits / data.cacheStats.totalQueries) * 100).toFixed(1)}%` 
            : '0.0%'
        });
      } else {
        fetchStats();
      }
    } catch (err) {
      alert('Không thể kết nối Backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await fetch(`${apiUrl}/api/cache/clear`, { method: 'POST' });
      setCacheStats({ hits: 0, misses: 0, totalQueries: 0, hitRatio: '0.0%' });
      setQueryLog([]);
      alert('Đã xóa toàn bộ cache Redis thành công!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>TỔNG SỐ TRUY VẤN</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: '#fff' }}>
            {cacheStats.totalQueries}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>CACHE HIT (RAM)</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: '#34d399' }}>
            {cacheStats.hits}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Tốc độ: ~1ms - 3ms</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>CACHE MISS (DATABASE)</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: '#f87171' }}>
            {cacheStats.misses}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Tốc độ: 150ms - 300ms</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600 }}>TỶ LỆ HIT RATIO</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px', color: '#60a5fa' }}>
            {cacheStats.hitRatio || '0.0%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Mục tiêu prod: &gt; 85%</div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚡ Phòng Thí Nghiệm Benchmark Độ Trễ & Cache Aside
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Kiểm chứng sự chênh lệch hiệu năng kinh hoàng giữa việc đọc dữ liệu từ Disk I/O của Database truyền thống và In-Memory Data Structure của Redis.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <select 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="prod_1">MacBook Pro M3 Max (ID: prod_1)</option>
            <option value="prod_2">iPhone 15 Pro Titanium (ID: prod_2)</option>
            <option value="prod_3">Sony WH-1000XM5 (ID: prod_3)</option>
            <option value="prod_4">Dell UltraSharp 32 (ID: prod_4)</option>
          </select>

          <button 
            className="btn-primary" 
            onClick={() => handleQuery(selectedProduct)}
            disabled={loading}
          >
            {loading ? 'Đang truy vấn...' : '🚀 Gửi Request Lấy Sản Phẩm'}
          </button>

          <button 
            className="btn-secondary" 
            onClick={() => handleQuery('prod_invalid')}
            title="Thử gửi ID không tồn tại để kiểm tra cơ chế Cache Penetration"
          >
            🛡️ Test Cache Penetration (ID Rác)
          </button>

          <button 
            className="btn-secondary" 
            onClick={handleClearCache}
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
          >
            🗑️ Xóa Sạch Cache (Flush)
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <input 
              type="checkbox" 
              checked={useMutex} 
              onChange={(e) => setUseMutex(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
            />
            Bật Mutex Lock (SingleFlight)
          </label>
        </div>

        {/* Live Visual Comparison Bar */}
        {queryLog.length > 0 && (
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600 }}>Request gần nhất:</span>
              <span style={{ color: queryLog[0].latencyMs < 10 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                {queryLog[0].latencyMs}ms ({queryLog[0].source})
              </span>
            </div>
            {/* Visual Bar representation */}
            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${Math.min(Math.max((queryLog[0].latencyMs / 300) * 100, 2), 100)}%`,
                  background: queryLog[0].latencyMs < 10 
                    ? 'linear-gradient(90deg, #10b981, #34d399)' 
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  borderRadius: '6px',
                  transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
              {queryLog[0].message}
            </div>
          </div>
        )}

        {/* History Stream */}
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
          Lịch Sử Truy Vấn Gần Nhất (Real-time Latency Inspector)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
          {queryLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              Chưa có request nào. Hãy bấm nút "Gửi Request Lấy Sản Phẩm" phía trên!
            </div>
          ) : (
            queryLog.map((item) => {
              const isHit = item.source.includes('CACHE_HIT');
              return (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    fontSize: '0.88rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={isHit ? 'badge badge-green' : 'badge badge-red'}>
                      {isHit ? '⚡ HIT' : '🐢 MISS'}
                    </span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{item.productName}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>({item.productId})</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: isHit ? '#34d399' : '#f87171',
                      fontFamily: 'var(--font-mono)' 
                    }}>
                      {item.latencyMs} ms
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{item.timestamp}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
