import React, { useState, useEffect } from 'react';

export default function FlashSaleTab({ apiUrl }) {
  const [stock, setStock] = useState(5);
  const [loading, setLoading] = useState(false);
  const [battleResults, setBattleResults] = useState(null);
  const [concurrentUsers, setConcurrentUsers] = useState(30);

  const fetchStock = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/lock/stock`);
      const data = await res.json();
      setStock(data.stock);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [apiUrl]);

  const handleResetStock = async (newAmount = 5) => {
    try {
      const res = await fetch(`${apiUrl}/api/lock/stock/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newAmount })
      });
      const data = await res.json();
      setStock(data.stock);
      setBattleResults(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const runSimulation = async (isSafeMode) => {
    setLoading(true);
    setBattleResults(null);

    // Chuẩn bị danh sách concurrent buyers
    const buyers = Array.from({ length: concurrentUsers }, (_, i) => `Buyer_${i + 1}`);
    const endpoint = isSafeMode ? `${apiUrl}/api/lock/purchase/safe` : `${apiUrl}/api/lock/purchase/unsafe`;

    const startTime = Date.now();

    try {
      // Bắn đồng thời toàn bộ requests cùng 1 thời điểm (Promise.all)
      const promises = buyers.map((buyerId) =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerId })
        }).then((res) => res.json())
      );

      const responses = await Promise.all(promises);
      const totalTimeMs = Date.now() - startTime;

      // Thống kê kết quả
      const successOrders = responses.filter((r) => r.success);
      const failedOrders = responses.filter((r) => !r.success);

      // Lấy tồn kho thực tế cuối cùng
      const stockRes = await fetch(`${apiUrl}/api/lock/stock`);
      const stockData = await stockRes.json();
      setStock(stockData.stock);

      setBattleResults({
        isSafeMode,
        totalBuyers: concurrentUsers,
        successCount: successOrders.length,
        failedCount: failedOrders.length,
        finalStock: stockData.stock,
        totalTimeMs,
        responses,
        hasOversold: isSafeMode ? false : successOrders.length > 5 || stockData.stock < 0,
      });
    } catch (err) {
      alert('Lỗi mô phỏng: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Flash Sale */}
      <div className="glass-card glass-card-glow" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-red" style={{ marginBottom: '8px' }}>
              🔥 SỰ KIỆN FLASH SALE 12.12
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>
              iPhone 15 Pro Titanium 256GB (Giảm 90%)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Chỉ có <strong style={{ color: '#fca5a5' }}>5 suất duy nhất</strong> dành cho {concurrentUsers} người tranh nhau bấm Mua cùng lúc!
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỒN KHO THỰC TẾ</div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 800, 
                color: stock < 0 ? '#ef4444' : stock === 0 ? 'var(--text-muted)' : '#10b981',
                fontFamily: 'var(--font-mono)' 
              }}>
                {stock}
              </div>
            </div>

            <button 
              className="btn-secondary" 
              onClick={() => handleResetStock(5)}
              disabled={loading}
            >
              🔄 Reset Kho = 5
            </button>
          </div>
        </div>
      </div>

      {/* Battle Trigger Controls */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          ⚔️ Cuộc Chiến Concurrency: Race Condition vs Distributed Lock
        </h3>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Số người mua đồng thời:</span>
            <input 
              type="number" 
              min="10" 
              max="100" 
              value={concurrentUsers}
              onChange={(e) => setConcurrentUsers(parseInt(e.target.value || '10', 10))}
              style={{
                width: '80px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '8px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          {/* Test Buttons */}
          <button 
            className="btn-danger"
            onClick={() => runSimulation(false)}
            disabled={loading || stock <= 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ⚠️ 1. Test KHÔNG Lock (Thảm Họa Race Condition)
          </button>

          <button 
            className="btn-primary"
            onClick={() => runSimulation(true)}
            disabled={loading || stock <= 0}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
          >
            🛡️ 2. Test CÓ Redis Lock (Atomic SET NX PX)
          </button>
        </div>

        {/* Status indicator when loading */}
        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#60a5fa', fontWeight: 600 }}>
            ⏳ Đang kích hoạt {concurrentUsers} requests đồng thời lên Backend...
          </div>
        )}

        {/* Results Analysis */}
        {battleResults && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              padding: '20px', 
              borderRadius: '12px', 
              background: battleResults.hasOversold ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${battleResults.hasOversold ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 700, 
                    color: battleResults.hasOversold ? '#fca5a5' : '#6ee7b7' 
                  }}>
                    {battleResults.hasOversold 
                      ? '❌ THẢM HỌA: XẢY RA LỖI BÁN QUÁ TỒN KHO (OVERSELLING)!' 
                      : '✅ THÀNH CÔNG: KHÓA PHÂN TÁN BẢO VỆ TOÀN VẸN DỮ LIỆU!'}
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {battleResults.isSafeMode 
                      ? 'Redis SET NX PX kết hợp Lua Script đảm bảo duy nhất 1 giao dịch được vào Critical Section. Đúng 5 sản phẩm được bán ra!'
                      : 'Các tiến trình đọc cùng 1 giá trị tồn kho trong lúc delay I/O, dẫn đến bán quá số lượng có sẵn trong thực tế!'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ĐÃ BÁN RA</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: battleResults.hasOversold ? '#ef4444' : '#10b981' }}>
                      {battleResults.successCount} chiếc
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>BỊ TỪ CHỐI</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      {battleResults.failedCount} người
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List of orders */}
            <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
              Chi Tiết Kết Quả Của {battleResults.totalBuyers} Requests Đồng Thời:
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {battleResults.responses.map((resp, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: resp.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${resp.success ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ color: '#fff' }}>{resp.buyerId}</span>
                    <span style={{ color: resp.success ? '#34d399' : '#94a3b8' }}>
                      {resp.success ? '🎉 Mua thành công' : '❌ Hết hàng'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px' }}>
                    Kho ghi nhận: {resp.remainingStock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
