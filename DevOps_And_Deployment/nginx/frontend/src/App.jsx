import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, ShieldAlert, Zap, Network, Activity, 
  ArrowRight, CheckCircle2, XCircle, RefreshCw, Layers, Cpu, Database
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('load-balancing');
  
  // State quản lý số liệu toàn cục
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    node1Count: 0,
    node2Count: 0,
    node3Count: 0,
    cacheHits: 0,
    cacheMisses: 0,
    rateLimitedCount: 0
  });

  // Load Balancing Tab State
  const [isAutoTraffic, setIsAutoTraffic] = useState(false);
  const [lastDispatchedNode, setLastDispatchedNode] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const autoTrafficTimer = useRef(null);

  // Rate Limiting Tab State
  const [burstResults, setBurstResults] = useState([]);
  const [isBursting, setIsBursting] = useState(false);

  // Microcache Tab State
  const [cacheResult, setCacheResult] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheHistory, setCacheHistory] = useState([]);

  // ----------------------------------------------------------------------------
  // HÀM GỬI REQUEST KIỂM TRA LOAD BALANCING (ROUND-ROBIN)
  // ----------------------------------------------------------------------------
  const sendLoadBalancingRequest = async () => {
    const startTime = performance.now();
    try {
      // Gọi qua Nginx endpoint /api/load-test
      const res = await fetch('/api/load-test');
      const data = await res.json();
      const duration = Math.round(performance.now() - startTime);
      
      const handledBy = data.handledBy || 'unknown';
      setLastDispatchedNode(handledBy);

      // Cập nhật số liệu
      setMetrics(prev => {
        let n1 = prev.node1Count;
        let n2 = prev.node2Count;
        let n3 = prev.node3Count;
        if (handledBy.includes('1')) n1++;
        else if (handledBy.includes('2')) n2++;
        else if (handledBy.includes('3')) n3++;

        return {
          ...prev,
          totalRequests: prev.totalRequests + 1,
          node1Count: n1,
          node2Count: n2,
          node3Count: n3
        };
      });

      const logItem = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        status: res.status,
        handledBy: handledBy,
        pid: data.processPid,
        ip: data.clientMetadata?.realIp || '127.0.0.1',
        duration: duration
      };

      setRecentLogs(prev => [logItem, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error('Request failed:', err);
    }
  };

  // Toggle Auto Traffic
  useEffect(() => {
    if (isAutoTraffic) {
      autoTrafficTimer.current = setInterval(() => {
        sendLoadBalancingRequest();
      }, 350);
    } else {
      if (autoTrafficTimer.current) clearInterval(autoTrafficTimer.current);
    }
    return () => {
      if (autoTrafficTimer.current) clearInterval(autoTrafficTimer.current);
    };
  }, [isAutoTraffic]);

  // ----------------------------------------------------------------------------
  // HÀM BẮN BURST TRAFFIC ĐỂ KIỂM CHỨNG RATE LIMITING (LEAKY BUCKET)
  // ----------------------------------------------------------------------------
  const triggerRateLimitBurst = async (count = 20) => {
    setIsBursting(true);
    setBurstResults([]);

    const promises = Array.from({ length: count }, async (_, index) => {
      const start = performance.now();
      try {
        const res = await fetch('/api/rate-limit-test');
        const duration = Math.round(performance.now() - start);
        return {
          index: index + 1,
          status: res.status,
          success: res.status === 200,
          duration: duration,
          time: new Date().toLocaleTimeString()
        };
      } catch (err) {
        return {
          index: index + 1,
          status: 429,
          success: false,
          duration: Math.round(performance.now() - start),
          time: new Date().toLocaleTimeString()
        };
      }
    });

    const results = await Promise.all(promises);
    setBurstResults(results);

    const blocked = results.filter(r => r.status === 429).length;
    setMetrics(prev => ({
      ...prev,
      rateLimitedCount: prev.rateLimitedCount + blocked
    }));

    setIsBursting(false);
  };

  // ----------------------------------------------------------------------------
  // HÀM KIỂM TRA MICROCACHING (HIT VS MISS)
  // ----------------------------------------------------------------------------
  const testMicrocaching = async () => {
    setCacheLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/products');
      const cacheStatus = res.headers.get('x-cache-status') || 'MISS/NONE';
      const handledBy = res.headers.get('x-handled-by') || 'Nginx Cache';
      const data = await res.json();
      const duration = Math.round(performance.now() - start);

      const resultObj = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        status: res.status,
        cacheStatus: cacheStatus,
        handledBy: handledBy,
        durationMs: duration,
        itemCount: data.data?.length || 0
      };

      setCacheResult(resultObj);
      setCacheHistory(prev => [resultObj, ...prev.slice(0, 9)]);

      setMetrics(prev => ({
        ...prev,
        cacheHits: cacheStatus === 'HIT' ? prev.cacheHits + 1 : prev.cacheHits,
        cacheMisses: cacheStatus !== 'HIT' ? prev.cacheMisses + 1 : prev.cacheMisses
      }));
    } catch (err) {
      console.error('Cache test failed:', err);
    } finally {
      setCacheLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER SECTION */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'linear-gradient(135deg, #009639, #00c853)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0, 200, 83, 0.4)' }}>
                <Server size={28} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #00e5ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Nginx Production Gateway Console
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Hạ tầng mô phỏng Reverse Proxy, Cân Bằng Tải Round-Robin, Rate Limiting & Microcaching
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-green">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676', display: 'inline-block' }}></span>
              Nginx Gateway :80
            </span>
            <span className="badge badge-blue">
              <Network size={14} />
              3 Upstream Replicas Active
            </span>
          </div>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TỔNG REQUEST ĐÃ GỬI</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{metrics.totalRequests}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TỶ LỆ ROUND-ROBIN (1:2:3)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {metrics.node1Count} <span style={{ color: 'var(--text-dim)' }}>:</span> {metrics.node2Count} <span style={{ color: 'var(--text-dim)' }}>:</span> {metrics.node3Count}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>MICROCACHE (HIT / MISS)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00e676' }}>
              {metrics.cacheHits} <span style={{ color: 'var(--text-dim)' }}>/</span> <span style={{ color: '#ffd740' }}>{metrics.cacheMisses}</span>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>NGINX CHẶN 429 (SPAM)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff5252' }}>{metrics.rateLimitedCount}</div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTab('load-balancing')}
          className={activeTab === 'load-balancing' ? 'btn-primary' : 'btn-secondary'}
        >
          <Network size={16} />
          1. Upstream Load Balancer
        </button>
        <button
          onClick={() => setActiveTab('rate-limiting')}
          className={activeTab === 'rate-limiting' ? 'btn-primary' : 'btn-secondary'}
        >
          <ShieldAlert size={16} />
          2. Rate Limiting Shield (Leaky Bucket)
        </button>
        <button
          onClick={() => setActiveTab('microcache')}
          className={activeTab === 'microcache' ? 'btn-primary' : 'btn-secondary'}
        >
          <Zap size={16} />
          3. Microcaching Benchmark
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={activeTab === 'headers' ? 'btn-primary' : 'btn-secondary'}
        >
          <Layers size={16} />
          4. Reverse Proxy Headers Inspector
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: UPSTREAM LOAD BALANCING DISPATCHER */}
      {/* ==================================================================== */}
      {activeTab === 'load-balancing' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* NODE 1 */}
            <div className="glass-panel" style={{ padding: '24px', border: lastDispatchedNode?.includes('1') ? '1px solid #00e676' : '1px solid var(--border-color)', boxShadow: lastDispatchedNode?.includes('1') ? '0 0 25px rgba(0,230,118,0.2)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge badge-green">REPLICA 1</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Port 3001</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>backend-1</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Express.js Node Worker Container</p>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00e676' }}>
                {metrics.node1Count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>requests</span>
              </div>
            </div>

            {/* NODE 2 */}
            <div className="glass-panel" style={{ padding: '24px', border: lastDispatchedNode?.includes('2') ? '1px solid #448aff' : '1px solid var(--border-color)', boxShadow: lastDispatchedNode?.includes('2') ? '0 0 25px rgba(68,138,255,0.2)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge badge-blue">REPLICA 2</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Port 3002</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>backend-2</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Express.js Node Worker Container</p>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#448aff' }}>
                {metrics.node2Count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>requests</span>
              </div>
            </div>

            {/* NODE 3 */}
            <div className="glass-panel" style={{ padding: '24px', border: lastDispatchedNode?.includes('3') ? '1px solid #ffd740' : '1px solid var(--border-color)', boxShadow: lastDispatchedNode?.includes('3') ? '0 0 25px rgba(255,215,64,0.2)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge badge-amber">REPLICA 3</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Port 3003</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>backend-3</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Express.js Node Worker Container</p>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffd740' }}>
                {metrics.node3Count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>requests</span>
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={sendLoadBalancingRequest} className="btn-primary">
              <ArrowRight size={16} />
              Gửi 1 Request
            </button>
            <button
              onClick={() => setIsAutoTraffic(!isAutoTraffic)}
              className={isAutoTraffic ? 'btn-danger' : 'btn-secondary'}
            >
              <Activity size={16} />
              {isAutoTraffic ? 'Dừng Tự Động Phân Phối' : 'Bật Auto Traffic (~3 req/s)'}
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Thuật toán đang cấu hình: <strong style={{ color: '#fff' }}>Round-Robin</strong> (Luân phiên đều giữa 3 node)
            </span>
          </div>

          {/* LOGS TABLE */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Nhật Ký Dispatch Thời Gian Thực (Nginx Access Stream)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                    <th style={{ padding: '10px 12px' }}>Mã Trạng Thái</th>
                    <th style={{ padding: '10px 12px' }}>Node Xử Lý (X-Handled-By)</th>
                    <th style={{ padding: '10px 12px' }}>Process PID</th>
                    <th style={{ padding: '10px 12px' }}>Client IP (Forwarded)</th>
                    <th style={{ padding: '10px 12px' }}>Độ Trễ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        Chưa có request nào. Bấm nút "Gửi 1 Request" để bắt đầu quan sát!
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{log.time}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="badge badge-green">{log.status} OK</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{log.handledBy}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{log.pid}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.ip}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--accent-cyan)' }}>{log.duration}ms</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: RATE LIMITING SHIELD (LEAKY BUCKET) */}
      {/* ==================================================================== */}
      {activeTab === 'rate-limiting' && (
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Cơ Chế Chặn Đứng Spam Bằng Giải Thuật Leaky Bucket</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Cấu hình hiện tại trong Nginx: <code style={{ color: 'var(--accent-cyan)' }}>rate=5r/s burst=10 nodelay</code>.  
              Khi gửi cùng lúc 20 request: 5 request đầu được phục vụ ngay, 10 request nằm trong bộ đệm burst, và 5 request vượt ngưỡng bị Nginx chặn đứng với mã lỗi <strong style={{ color: '#ff5252' }}>429 Too Many Requests</strong>.
            </p>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => triggerRateLimitBurst(20)}
                disabled={isBursting}
                className="btn-danger"
              >
                <ShieldAlert size={16} />
                {isBursting ? 'Đang bắn traffic dồn dập...' : 'Bắn Dồn Dập Burst (20 Requests Cùng Lúc)'}
              </button>
              <button
                onClick={() => triggerRateLimitBurst(3)}
                disabled={isBursting}
                className="btn-secondary"
              >
                Gửi 3 Request An Toàn (Trong ngưỡng)
              </button>
            </div>
          </div>

          {/* BURST RESULTS VISUALIZER */}
          {burstResults.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Kết Quả Kiểm Thử Burst Traffic</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                {burstResults.map(res => (
                  <div
                    key={res.index}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: res.status === 200 ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 23, 68, 0.15)',
                      border: res.status === 200 ? '1px solid rgba(0, 200, 83, 0.3)' : '1px solid rgba(255, 23, 68, 0.4)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Req #{res.index}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: res.status === 200 ? '#00e676' : '#ff5252', margin: '4px 0' }}>
                      {res.status}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{res.duration}ms</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MICROCACHING BENCHMARK */}
      {/* ==================================================================== */}
      {activeTab === 'microcache' && (
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Microcaching Tốc Độ Ánh Sáng Tại Nginx</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Cấu hình: <code style={{ color: 'var(--accent-cyan)' }}>proxy_cache_valid 200 30s;</code>.  
              Lần đầu truy cập (Cache MISS): Nginx chuyển tiếp sang Backend, tốn ~120ms - 150ms để tính toán dữ liệu.  
              Các lần truy cập sau trong vòng 30s (Cache HIT): Nginx trả dữ liệu trực tiếp từ RAM/Disk trong ~1ms mà không làm phiền Backend!
            </p>

            <button
              onClick={testMicrocaching}
              disabled={cacheLoading}
              className="btn-primary"
            >
              <Zap size={16} />
              {cacheLoading ? 'Đang truy vấn...' : 'Truy Vấn Danh Mục Sản Phẩm (/api/products)'}
            </button>
          </div>

          {cacheResult && (
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', border: cacheResult.cacheStatus === 'HIT' ? '1px solid #00e676' : '1px solid #ffd740' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className={cacheResult.cacheStatus === 'HIT' ? 'badge badge-green' : 'badge badge-amber'}>
                  STATUS: {cacheResult.cacheStatus}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thời gian: {cacheResult.timestamp}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ĐỘ TRỄ PHẢN HỒI</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: cacheResult.cacheStatus === 'HIT' ? '#00e676' : '#ffd740' }}>
                    {cacheResult.durationMs} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ms</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>NGUỒN CUNG CẤP NỘI DUNG</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
                    {cacheResult.cacheStatus === 'HIT' ? 'Bộ Nhớ Đệm Nginx (RAM/Disk)' : `Backend Upstream (${cacheResult.handledBy})`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CACHE HISTORY TABLE */}
          {cacheHistory.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Lịch Sử Truy Vấn Cache</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Thời Gian</th>
                      <th style={{ padding: '8px 12px' }}>X-Cache-Status</th>
                      <th style={{ padding: '8px 12px' }}>Độ Trễ</th>
                      <th style={{ padding: '8px 12px' }}>X-Handled-By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacheHistory.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{item.timestamp}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className={item.cacheStatus === 'HIT' ? 'badge badge-green' : 'badge badge-amber'}>
                            {item.cacheStatus}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: item.cacheStatus === 'HIT' ? '#00e676' : '#ffd740' }}>
                          {item.durationMs}ms
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{item.handledBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: REVERSE PROXY HEADERS INSPECTOR */}
      {/* ==================================================================== */}
      {activeTab === 'headers' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Các Header Nginx Đã Tiêm (Reverse Proxy Headers)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Nginx không chỉ chuyển tiếp byte thô, mà còn tái cấu trúc HTTP headers để bảo toàn danh tính người dùng và bảo mật hệ thống.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <code style={{ color: '#00e5ff', fontWeight: 600 }}>Host $host;</code>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Bảo toàn tên miền gốc của client (ví dụ `api.domain.com`), ngăn ngừa backend redirect nhầm về IP nội bộ của docker.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <code style={{ color: '#00e5ff', fontWeight: 600 }}>X-Real-IP $remote_addr;</code>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Cung cấp địa chỉ IP thực tế của khách hàng. Backend dùng thông tin này để ghi log và chống brute-force.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <code style={{ color: '#00e5ff', fontWeight: 600 }}>X-Forwarded-For $proxy_add_x_forwarded_for;</code>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Chuỗi danh sách tất cả các proxy mà request đã đi qua, tuân thủ tiêu chuẩn RFC 7239.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <code style={{ color: '#00e5ff', fontWeight: 600 }}>X-Forwarded-Proto $scheme;</code>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Ghi nhận giao thức gốc (`https` hoặc `http`). Giúp backend biết client truy cập bằng SSL để không redirect vòng lặp HTTPS.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
