import React, { useState, useEffect } from 'react';

export default function RateLimiterTab({ apiUrl }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [countdown, setCountdown] = useState(0);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/ratelimit/check?limit=10&windowMs=10000`);
      const data = await res.json();
      setStatus(data);
      if (data.history) {
        setHistory(data.history);
      }
      if (!data.allowed && data.retryAfterSeconds) {
        setCountdown(data.retryAfterSeconds);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/ratelimit/check?limit=10&windowMs=10000`);
      const data = await res.json();
      setStatus(data);
      if (data.history) {
        setHistory(data.history);
      }
      if (!data.allowed) {
        setCountdown(data.retryAfterSeconds || 10);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${apiUrl}/api/ratelimit/reset`, { method: 'POST' });
      setStatus(null);
      setHistory([]);
      setCountdown(0);
      alert('Đã reset rate limit thành công!');
    } catch (err) {
      alert(err.message);
    }
  };

  const currentCount = status?.currentCount || history.length || 0;
  const limit = 10;
  const percentage = Math.min((currentCount / limit) * 100, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
          ⏱️ Trực Quan Hóa Thuật Toán Sliding Window Log (Redis Sorted Set)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Mỗi request được ghi nhận dưới dạng một phần tử trong Redis Sorted Set với score là Unix timestamp (ms).
          Hệ thống loại bỏ chính xác các request nằm ngoài cửa sổ trượt 10 giây (dùng <code className="font-mono" style={{ color: '#fca5a5' }}>ZREMRANGEBYSCORE</code>),
          ngăn chặn triệt để lỗ hổng traffic burst của Fixed Window!
        </p>

        {/* Capacity Gauge */}
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Dung lượng cửa sổ trượt (10s):</span>
            <span style={{ 
              fontWeight: 700, 
              color: percentage >= 100 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#10b981',
              fontFamily: 'var(--font-mono)'
            }}>
              {currentCount} / {limit} Requests
            </span>
          </div>

          <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '7px', overflow: 'hidden' }}>
            <div 
              style={{
                height: '100%',
                width: `${percentage}%`,
                background: percentage >= 100 
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                  : percentage > 70 
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                    : 'linear-gradient(90deg, #10b981, #059669)',
                transition: 'width 0.3s ease',
                borderRadius: '7px'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary" 
            onClick={handleSendRequest}
            disabled={loading}
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            🔥 Bấm Liên Tục Để Spam Request
          </button>

          <button 
            className="btn-secondary" 
            onClick={handleReset}
          >
            🔄 Reset Bộ Đếm Limiter
          </button>
        </div>

        {/* Rate limit blocked notification */}
        {status && !status.allowed && (
          <div style={{ 
            marginTop: '20px',
            padding: '16px', 
            borderRadius: '10px', 
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>🛑</span>
              <div>
                <strong style={{ color: '#fca5a5' }}>HTTP 429 Too Many Requests</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Bạn đã chạm trần 10 requests / 10s. Lua script nguyên tử đã chặn request bảo vệ hệ thống!
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '100px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>COOLDOWN</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {countdown}s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sorted Set Visual Inspection */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-muted)' }}>
          Cấu Trúc Sorted Set (ZSET) Hiện Tại Trong Bộ Nhớ Redis:
        </h4>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Cửa sổ thời gian hiện đang trống (0 phần tử). Bấm nút spam để tạo các bản ghi!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((item, idx) => (
              <div 
                key={idx}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-blue">Slot #{idx + 1}</span>
                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{item.member}</span>
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>
                  Score (Unix ms): {item.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
