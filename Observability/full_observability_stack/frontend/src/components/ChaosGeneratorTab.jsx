import React, { useState } from 'react';

export default function ChaosGeneratorTab({ apiBase, onActionComplete }) {
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  // 1. Tiêm độ trễ nhân tạo
  const handleInjectLatency = async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/orders/simulate-slow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: 'item-sony', quantity: 1, delayMs: 2500 }),
      });
      const data = await res.json();
      setResultMessage({
        type: 'warning',
        title: '⚠️ Đã tiêm độ trễ 2500ms thành công!',
        detail: `Đơn hàng ${data.data?.orderId} mất ${data.data?.durationMs}ms. Hãy kiểm tra tab Traces (Span kéo dài) và Prometheus Histogram P95!`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setResultMessage({ type: 'error', title: 'Lỗi', detail: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 2. Tiêm lỗi 500 sập thanh toán
  const handleInjectError = async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/orders/simulate-error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: 'item-iphone', quantity: 1 }),
      });
      setResultMessage({
        type: 'danger',
        title: '🔥 Đã tiêm ngoại lệ HTTP 500 thành công!',
        detail: 'Cổng thanh toán bị sập giả lập. Kiểm tra tab Logs (Loki ERROR có stack trace), tab Traces (Span màu đỏ lỗi), và Prometheus Error Counter!'
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setResultMessage({ type: 'error', title: 'Lỗi', detail: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 3. Bùng nổ lưu lượng Burst Traffic
  const handleInjectBurst = async (count = 15) => {
    setLoading(true);
    setResultMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/orders/simulate-burst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      setResultMessage({
        type: 'success',
        title: `🚀 Đã phát sinh ${count} requests đồng thời!`,
        detail: `Hoàn tất: ${data.completed} | Thất bại: ${data.failed}. Kiểm tra biểu đồ Throughput (RPS) và In-flight Gauge trong Grafana / Prometheus!`
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setResultMessage({ type: 'error', title: 'Lỗi', detail: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🧪</span> Chaos Engineering & Alert Testing Lab
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Trong môi trường sản xuất (Production), hệ thống không chỉ hoạt động trong điều kiện hoàn hảo. Bộ công cụ kiểm thử này giúp bạn chủ động tiêm sự cố để kiểm chứng cảnh báo của Prometheus, trực quan của Grafana, vết lỗi của Jaeger và log của Loki.
        </p>
      </div>

      {/* Thông báo kết quả sau khi bấm */}
      {resultMessage && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: resultMessage.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : resultMessage.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${resultMessage.type === 'danger' ? '#ef4444' : resultMessage.type === 'warning' ? '#f59e0b' : '#10b981'}`
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', color: '#fff' }}>
            {resultMessage.title}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {resultMessage.detail}
          </div>
        </div>
      )}

      {/* 3 Thẻ hành động Chaos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Kịch bản 1: Độ trễ P95 Spike */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⏱️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fbbf24' }}>
              Tiêm Độ Trễ Nhân Tạo (2.5 Giây)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              Mô phỏng truy vấn cơ sở dữ liệu bị Lock tranh chấp tài nguyên hoặc mạng bên ngoài chậm.
              <br /><br />
              <strong>Hiện tượng:</strong> Kích hoạt cảnh báo <code className="font-mono" style={{ color: '#fbbf24' }}>HighP95Latency</code> trong Prometheus và thanh span dài trong Jaeger.
            </p>
          </div>
          <button
            disabled={loading}
            onClick={handleInjectLatency}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Đang gửi...' : '⚡ Kích Hoạt Latency Spike'}
          </button>
        </div>

        {/* Kịch bản 2: Lỗi sập hệ thống 500 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>💥</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f87171' }}>
              Tiêm Lỗi 500 (Payment Crash)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              Mô phỏng cổng thanh toán bên thứ ba bị từ chối thẻ hoặc mất kết nối mạng.
              <br /><br />
              <strong>Hiện tượng:</strong> Tỷ lệ lỗi 5xx tăng vọt, Prometheus cảnh báo <code className="font-mono" style={{ color: '#f87171' }}>HighHttpErrorRate</code>, Loki ghi nhận Log đỏ kèm Stack Trace.
            </p>
          </div>
          <button
            disabled={loading}
            onClick={handleInjectError}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Đang gửi...' : '🔥 Kích Hoạt Lỗi 500 Crash'}
          </button>
        </div>

        {/* Kịch bản 3: Bão lưu lượng Burst Traffic */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🌊</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#60c5ea' }}>
              Bão Lưu Lượng (Burst 20 Requests)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              Phát sinh 20 giao dịch cùng một lúc kết hợp ngẫu nhiên các kịch bản thành công và lỗi.
              <br /><br />
              <strong>Hiện tượng:</strong> Tăng vọt Throughput (RPS), Gauge In-flight nhảy vọt, kiểm chứng năng lực chịu tải của hệ thống.
            </p>
          </div>
          <button
            disabled={loading}
            onClick={() => handleInjectBurst(20)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(96, 197, 234, 0.4)',
              background: 'rgba(96, 197, 234, 0.2)',
              color: '#60c5ea',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Đang gửi...' : '🚀 Bắn 20 Requests Đồng Thời'}
          </button>
        </div>
      </div>
    </div>
  );
}
