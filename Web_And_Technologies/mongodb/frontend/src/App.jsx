import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  Search, 
  RefreshCw, 
  Activity, 
  ArrowRightLeft, 
  ShieldAlert, 
  Zap, 
  FileText, 
  PlusCircle,
  Clock,
  Cpu,
  Server
} from 'lucide-react';

const API_BASE = 'http://localhost:4003';

export default function App() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [queryPlan, setQueryPlan] = useState(null);
  const [txLog, setTxLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form states
  const [customerName, setCustomerName] = useState('Alex Rivers');
  const [productName, setProductName] = useState('MacBook Pro M3 Max');
  const [productPrice, setProductPrice] = useState(3499);
  const [simulateTxFail, setSimulateTxFail] = useState(false);
  const [writeConcern, setWriteConcern] = useState('majority');

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchOrders();
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          items: [{ name: productName, price: Number(productPrice), qty: 1 }],
          writeConcern
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Tạo Order thành công! Document ID: ${data.order._id.substring(0, 8)}...`, 'success');
        fetchOrders();
        fetchStats();
      } else {
        showToast(data.message || 'Lỗi khi tạo order', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunExplain = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/explain?type=${type}`);
      const data = await res.json();
      setQueryPlan(data);
      showToast(`Chạy query explain (${type}): ${data.executionStage} trong ${data.executionTimeMillis}ms`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTransaction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/transactions/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Wallet_UserA',
          to: 'Escrow_MerchantB',
          amount: 500,
          simulateFail: simulateTxFail
        })
      });
      const data = await res.json();
      setTxLog(prev => [data, ...prev.slice(0, 4)]);
      if (data.status === 'COMMITTED') {
        showToast('ACID Transaction COMMITTED thành công!', 'success');
      } else {
        showToast(`Transaction ABORTED / ROLLED BACK: ${data.message}`, 'error');
      }
      fetchStats();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050811', color: '#e2e8f0', padding: '24px' }}>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          background: notification.type === 'error' ? '#ef4444' : notification.type === 'success' ? '#10b981' : '#0284c7',
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {notification.type === 'error' ? <ShieldAlert size={20} /> : <Zap size={20} />}
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #00ED64 0%, #00684A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={24} color="#001E2B" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, background: 'linear-gradient(to right, #00ED64, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MongoDB Internals & WiredTiger Engine Visualizer
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Document Modeling (Embedding vs Referencing) • WiredTiger B-Tree & Cache • ACID Transactions • IXSCAN vs COLLSCAN
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', border: '1px solid #334155', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stats?.connected ? '#10b981' : '#ef4444', display: 'inline-block' }}></span>
            <span>{stats?.connected ? 'WiredTiger Connected' : 'Disconnected'}</span>
          </div>
          <button 
            onClick={() => { fetchStats(); fetchOrders(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
            <span>Active Database</span>
            <Server size={18} color="#00ED64" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{stats?.dbName || 'ecom_study'}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Storage: WiredTiger Engine</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
            <span>Orders Collection</span>
            <FileText size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{stats?.ordersCount ?? '--'} docs</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Avg size: ~480 bytes BSON</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
            <span>Index Count</span>
            <Search size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{stats?.indexCount ?? 3} Indices</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>_id_1, customer_1, status_1</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
            <span>WiredTiger Cache</span>
            <Cpu size={18} color="#ec4899" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>50% RAM Allocation</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Checkpoint every 60s</div>
        </div>
      </div>

      {/* Main Grid Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Panel 1: Document Modeling & Write Concern Simulator */}
        <div style={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <PlusCircle size={20} color="#00ED64" />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>1. BSON Document Insertion & Write Concern</h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
            Mô hình hóa tài liệu E-Commerce bằng kỹ thuật <strong>Embedded Document Pattern</strong> (nhúng mảng items trực tiếp vào Order thay vì tách bảng join).
          </p>

          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Customer Name</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Item Name (Embedded Array)</label>
                <input 
                  type="text" 
                  value={productName} 
                  onChange={e => setProductName(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Price ($ USD)</label>
                <input 
                  type="number" 
                  value={productPrice} 
                  onChange={e => setProductPrice(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px' }} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Write Concern (w: Ack Level)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['1', 'majority'].map(level => (
                  <label key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="radio" 
                      name="wc" 
                      value={level} 
                      checked={writeConcern === level}
                      onChange={() => setWriteConcern(level)}
                    />
                    <span>w: {level} ({level === '1' ? 'Primary memory ack' : 'Majority replica ack'})</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ marginTop: '8px', background: '#00ED64', color: '#001E2B', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: '0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <PlusCircle size={16} /> Lưu Document BSON (Write Concern {writeConcern})
            </button>
          </form>

          {/* Recent Orders List */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>Tài liệu gần nhất trong Collection</h4>
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orders.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', padding: '12px', textAlign: 'center', background: '#0f172a', borderRadius: '8px' }}>Chưa có document nào</div>
              ) : (
                orders.map(order => (
                  <div key={order._id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>{order.customerName}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>${order.totalAmount}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>_id: {order._id.substring(0, 16)}...</span>
                      <span>Items: {order.items?.length || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel 2: Execution Plan Explain (IXSCAN vs COLLSCAN) */}
        <div style={{ background: '#0b1120', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Search size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>2. Query Planner: IXSCAN vs COLLSCAN</h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
            So sánh hiệu năng giữa tìm kiếm có B-Tree Index (<code>IXSCAN</code>) và quét toàn bộ ổ đĩa (<code>COLLSCAN</code>).
          </p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => handleRunExplain('indexed')}
              disabled={loading}
              style={{ flex: 1, background: '#064e3b', border: '1px solid #059669', color: '#34d399', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              🚀 Query Indexed (customerName)
            </button>
            <button
              onClick={() => handleRunExplain('unindexed')}
              disabled={loading}
              style={{ flex: 1, background: '#451a03', border: '1px solid #b45309', color: '#fbbf24', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              ⚠️ Query Unindexed (metadata.tag)
            </button>
          </div>

          {/* Explain Result Card */}
          {queryPlan ? (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>Execution Plan Summary</span>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontWeight: 700,
                  background: queryPlan.executionStage.includes('IXSCAN') ? '#065f46' : '#7f1d1d',
                  color: queryPlan.executionStage.includes('IXSCAN') ? '#34d399' : '#f87171'
                }}>
                  {queryPlan.executionStage}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Documents Examined</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{queryPlan.totalDocsExamined} docs</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Keys Examined</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{queryPlan.totalKeysExamined} keys</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Documents Returned</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{queryPlan.nReturned} docs</div>
                </div>
                <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Execution Time</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>{queryPlan.executionTimeMillis} ms</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#94a3b8', background: '#020617', padding: '10px', borderRadius: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
                {queryPlan.executionStage.includes('IXSCAN') ? (
                  <span style={{ color: '#34d399' }}>✓ Sử dụng B-Tree Index: Duyệt trực tiếp qua index key pointer, không tốn I/O quét toàn bảng.</span>
                ) : (
                  <span style={{ color: '#f87171' }}>⚠️ COLLSCAN ALERT: MongoDB phải load tất cả các document từ Disk/Cache lên để kiểm tra điều kiện lọc! Rất nguy hiểm trên production.</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '8px', padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Bấm một trong hai nút phía trên để kiểm tra Query Planner Execution Stats.
            </div>
          )}

          {/* Panel 3: ACID Multi-Document Transaction Simulator */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #1e293b', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ArrowRightLeft size={20} color="#ec4899" />
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>3. ACID Multi-Document Transaction</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '14px' }}>
              Thử nghiệm chuyển tiền giữa 2 ví độc lập trong 1 Transaction Session. Kiểm tra cơ chế Rollback tự động khi có ngoại lệ.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={simulateTxFail} 
                  onChange={e => setSimulateTxFail(e.target.checked)} 
                />
                <span style={{ color: simulateTxFail ? '#f87171' : '#cbd5e1', fontWeight: simulateTxFail ? 700 : 400 }}>
                  Kích hoạt lỗi ngoại lệ (Simulate Exception to trigger AbortTransaction)
                </span>
              </label>
            </div>

            <button 
              onClick={handleRunTransaction}
              disabled={loading}
              style={{ width: '100%', background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <ArrowRightLeft size={16} /> Chạy Transaction (Wallet_UserA -$500 & Escrow_MerchantB +$500)
            </button>

            {txLog.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {txLog.map((log, idx) => (
                  <div key={idx} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: log.status === 'COMMITTED' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      [{log.status}]
                    </span>
                    <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{log.message}</span>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>{new Date().toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
