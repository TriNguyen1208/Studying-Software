import React, { useState, useEffect } from 'react';

export default function OrderFlowTab({ apiBase, onOrderCreated, selectedTraceId, setSelectedTraceId }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  // Tải danh sách kho và đơn hàng gần đây
  const fetchStatus = async () => {
    try {
      const [invRes, ordersRes] = await Promise.all([
        fetch(`${apiBase}/api/inventory`),
        fetch(`${apiBase}/api/orders/recent`),
      ]);
      const invData = await invRes.json();
      const ordersData = await ordersRes.json();
      if (invData.success) setInventory(invData.data);
      if (ordersData.success) setRecentOrders(ordersData.data);
    } catch (_err) {
      // Backend có thể đang khởi động
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Đặt hàng bình thường
  const handlePlaceOrder = async (itemId) => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: 1, customerId: 'cust_vip_user' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: `Đơn hàng ${data.data.orderId} thành công trong ${data.data.durationMs}ms! Trace ID đã được sinh ra.`,
        });
        setSelectedTraceId(data.data.traceId);
        if (onOrderCreated) onOrderCreated(data.data);
        fetchStatus();
      } else {
        setActionMessage({ type: 'error', text: data.error?.message || 'Lỗi đặt hàng' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Lỗi kết nối Backend: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner thông báo */}
      {actionMessage && (
        <div style={{
          padding: '1rem',
          borderRadius: '10px',
          background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid sản phẩm */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🛒</span> Kho Hàng E-Commerce & Đặt Hàng Demo
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Mỗi lần bạn bấm <strong>"Đặt mua ngay"</strong>, Backend sẽ sinh ra 1 <strong>Trace ID duy nhất</strong>, ghi nhận Spans vào <strong>Jaeger</strong>, ghi Metrics vào <strong>Prometheus</strong>, và phát hành log JSON sang <strong>Loki</strong>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {inventory.map((item) => (
            <div key={item.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>
                    {item.id.includes('macbook') ? '💻' : item.id.includes('iphone') ? '📱' : item.id.includes('sony') ? '🎧' : '⌨️'}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: item.stock > 10 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: item.stock > 10 ? '#34d399' : '#f87171'
                  }}>
                    Còn: {item.stock} cái
                  </span>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{item.name}</h3>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', marginBottom: '1rem' }}>
                  ${item.price.toLocaleString()}
                </div>
              </div>

              <button
                disabled={loading || item.stock <= 0}
                onClick={() => handlePlaceOrder(item.id)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: loading || item.stock <= 0 ? 'not-allowed' : 'pointer',
                  opacity: loading || item.stock <= 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{loading ? 'Đang đo lường...' : '⚡ Đặt Mua Ngay'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danh sách đơn hàng gần nhất */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋</span> Lịch Sử Giao Dịch Gần Nhất (Trace Correlation)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cập nhật tự động mỗi 3s</span>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
            Chưa có giao dịch nào. Hãy bấm "Đặt Mua Ngay" ở trên để tạo giao dịch đầu tiên!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Mã Đơn</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Sản Phẩm</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Thời Gian</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Độ Trễ</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Trạng Thái</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Trace ID (OpenTelemetry)</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 10).map((ord) => (
                  <tr
                    key={ord.orderId}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: selectedTraceId === ord.traceId ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedTraceId(ord.traceId)}
                  >
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#f1f5f9' }}>{ord.orderId}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{ord.item || ord.itemId}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {new Date(ord.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        color: ord.durationMs > 1000 ? '#f87171' : ord.durationMs > 300 ? '#fbbf24' : '#34d399',
                        fontWeight: 600
                      }}>
                        {ord.durationMs}ms
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className={ord.status === 'COMPLETED' ? 'badge badge-2xx' : 'badge badge-5xx'}>
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        className="font-mono"
                        style={{
                          color: '#60c5ea',
                          textDecoration: 'underline',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        🔍 {ord.traceId ? ord.traceId.substring(0, 12) + '...' : 'local'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
