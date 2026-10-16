import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Lock, Unlock, Cookie, 
  Key, RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, Terminal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('jar');
  
  // Trạng thái Cookie & Session
  const [inspectData, setInspectData] = useState(null);
  const [jsVisibleCookies, setJsVisibleCookies] = useState('');
  const [authStatus, setAuthStatus] = useState('UNAUTHENTICATED');
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Đọc các cookie mà JavaScript có quyền truy cập
  const readJsCookies = () => {
    const raw = document.cookie;
    setJsVisibleCookies(raw || '(Trống - Không có cookie nào cho phép JavaScript đọc)');
  };

  useEffect(() => {
    readJsCookies();
  }, []);

  const addLog = (type, message) => {
    const newLog = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev.slice(0, 15)]);
  };

  // ----------------------------------------------------------------------------
  // 1. ĐĂNG NHẬP & NHẬN COOKIE TỪ SERVER
  // ----------------------------------------------------------------------------
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cookies/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // BẮT BUỘC để nhận Set-Cookie
        body: JSON.stringify({ username: 'developer_pro', role: 'admin' })
      });
      const data = await res.json();
      
      setAuthStatus('LOGGED_IN');
      addLog('SUCCESS', 'Server phản hồi Set-Cookie: 1 Public Cookie và 1 Signed HttpOnly Cookie!');
      readJsCookies();
      handleInspect();
    } catch (err) {
      addLog('ERROR', 'Đăng nhập thất bại: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // 2. INSPECT & KIỂM TRA CHỮ KÝ HMAC TỪ SERVER
  // ----------------------------------------------------------------------------
  const handleInspect = async () => {
    try {
      const res = await fetch('/api/cookies/inspect', {
        method: 'GET',
        credentials: 'include' // BẮT BUỘC để tự động đính kèm cookie
      });
      const data = await res.json();
      setInspectData(data);

      if (res.ok) {
        setAuthStatus('AUTHENTICATED');
        addLog('VERIFY', 'Chữ ký số HMAC của cookie hoàn toàn hợp lệ!');
      } else {
        if (data.error === 'COOKIE_TAMPERING_DETECTED') {
          setAuthStatus('TAMPERED');
          addLog('TAMPER', '🚨 PHÁT HIỆN GIAN LẬN: Chữ ký HMAC của cookie không khớp!');
        } else {
          setAuthStatus('UNAUTHENTICATED');
        }
      }
      readJsCookies();
    } catch (err) {
      console.error('Inspect error:', err);
    }
  };

  // ----------------------------------------------------------------------------
  // 3. ĐĂNG XUẤT & XÓA COOKIE CHUẨN MỰC
  // ----------------------------------------------------------------------------
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/cookies/logout', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      setAuthStatus('UNAUTHENTICATED');
      setInspectData(null);
      addLog('LOGOUT', 'Đã xóa toàn bộ cookie an toàn với Max-Age=0.');
      readJsCookies();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ff9a8b, #ff6a88)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(255, 106, 136, 0.4)' }}>
              <Cookie size={28} color="#1a080c" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #ff9a8b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                HTTP Cookies & Security Architecture Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                RFC 6265bis, HttpOnly XSS Shield, SameSite CSRF Defense & HMAC-SHA256 Signed Integrity
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={authStatus === 'AUTHENTICATED' ? 'badge badge-green' : authStatus === 'TAMPERED' ? 'badge badge-red' : 'badge badge-amber'}>
              {authStatus === 'AUTHENTICATED' ? 'SESSION VALID (HMAC OK)' : authStatus === 'TAMPERED' ? 'TAMPERING DETECTED' : 'UNAUTHENTICATED'}
            </span>
          </div>
        </div>

        {/* CONTROLS STRIP */}
        <div className="glass-panel" style={{ padding: '20px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button onClick={handleLogin} disabled={isLoading} className="btn-primary">
            <Lock size={16} />
            1. Đăng Nhập (Cấp Cookie Bảo Mật)
          </button>
          <button onClick={handleInspect} className="btn-secondary">
            <RefreshCw size={16} />
            2. Kiểm Duyệt Cookie (Inspect Request)
          </button>
          <button onClick={handleLogout} className="btn-secondary" style={{ color: '#ff5252', borderColor: 'rgba(255,23,68,0.3)' }}>
            <Unlock size={16} />
            3. Đăng Xuất (Clear Cookie)
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTab('jar')}
          className={activeTab === 'jar' ? 'btn-primary' : 'btn-secondary'}
        >
          <Cookie size={16} />
          1. Cookie Jar & Bảo Mật 4 Cờ
        </button>
        <button
          onClick={() => setActiveTab('xss')}
          className={activeTab === 'xss' ? 'btn-primary' : 'btn-secondary'}
        >
          <ShieldAlert size={16} />
          2. Lá Chắn XSS (HttpOnly Shield)
        </button>
        <button
          onClick={() => setActiveTab('tampering')}
          className={activeTab === 'tampering' ? 'btn-primary' : 'btn-secondary'}
        >
          <Key size={16} />
          3. Chống Sửa Đổi (HMAC Signed Integrity)
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: COOKIE JAR & SECURITY FLAGS */}
      {/* ==================================================================== */}
      {activeTab === 'jar' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* PUBLIC COOKIE */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge badge-cyan">PUBLIC COOKIE</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Path: /</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>client_theme</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Dùng cho giao diện, ngôn ngữ. Không chứa bí mật.
              </p>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <div>HttpOnly: <strong style={{ color: '#ff5252' }}>false</strong></div>
                <div>SameSite: <strong style={{ color: '#00e676' }}>lax</strong></div>
                <div>Giá trị: <strong style={{ color: '#00e5ff' }}>"dark_cyberpunk"</strong></div>
              </div>
            </div>

            {/* SECURE SIGNED COOKIE */}
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255, 154, 139, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge badge-amber">SIGNED & HTTPONLY</span>
                <span style={{ fontSize: '0.8rem', color: '#00e676' }}>AN TOÀN TUYỆT ĐỐI</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>secure_session</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Lưu Token/Session ID đăng nhập. Được ký số HMAC-SHA256.
              </p>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <div>HttpOnly: <strong style={{ color: '#00e676' }}>true (Chống XSS)</strong></div>
                <div>SameSite: <strong style={{ color: '#00e676' }}>lax (Chống CSRF)</strong></div>
                <div>Signed: <strong style={{ color: '#ff9a8b' }}>HMAC-SHA256</strong></div>
              </div>
            </div>
          </div>

          {/* INSPECTED DATA BOX */}
          {inspectData && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#00e676" />
                Dữ Liệu Server Đọc Được Từ Header Cookie
              </h4>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '10px', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                <pre style={{ margin: 0, color: '#f0f4f8' }}>{JSON.stringify(inspectData, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: XSS SHIELD (HTTPONLY DEMO) */}
      {/* ==================================================================== */}
      {activeTab === 'xss' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Minh Chứng Lá Chắn Chống XSS Của Cờ HttpOnly
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Nếu trang web dính lỗ hổng XSS, hacker sẽ chạy lệnh <code style={{ color: '#00e5ff' }}>document.cookie</code> để đánh cắp phiên đăng nhập.  
            Nhờ có <strong style={{ color: '#00e676' }}>HttpOnly: true</strong>, trình duyệt giấu kín cookie nhạy cảm hoàn toàn khỏi JavaScript!
          </p>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={16} />
              Kết quả thực thi mã JavaScript thực tế: <code>console.log(document.cookie)</code>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#ff9a8b' }}>
              {jsVisibleCookies}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)' }}>
            <CheckCircle2 size={20} color="#00e676" />
            <span style={{ fontSize: '0.875rem', color: '#fff' }}>
              <strong>KẾT LUẬN KIỂM CHỨNG:</strong> Bạn chỉ nhìn thấy cookie <code style={{ color: '#00e5ff' }}>client_theme</code>. Cookie <code style={{ color: '#ff9a8b' }}>secure_session</code> hoàn toàn vô hình đối với JavaScript!
            </span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: TAMPERING & HMAC INTEGRITY */}
      {/* ==================================================================== */}
      {activeTab === 'tampering' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Bản Chất Chữ Ký Số HMAC-SHA256 (Signed Cookies)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Khi sử dụng Signed Cookies, giá trị lưu trên trình duyệt có cấu trúc: <code style={{ color: 'var(--cookie-amber)' }}>s:GIÁ_TRỊ_GỐC.CHỮ_KÝ_HMAC</code>.  
            Nếu người dùng tự ý chỉnh sửa giá trị (ví dụ đổi role thành admin), chữ ký HMAC sẽ không còn khớp và Server lập tức từ chối request!
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, color: '#00e676', marginBottom: '4px' }}>1. Giá trị hợp lệ (Valid Signature):</div>
              <code style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                s:%7B%22username%22%3A%22alice%22%7D.k8J3...zQ9x
              </code>
              <div style={{ fontSize: '0.8rem', color: '#00e676', marginTop: '4px' }}>
                => Server tính toán lại HMAC khớp hoàn toàn => Cho phép truy cập!
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,23,68,0.3)' }}>
              <div style={{ fontWeight: 700, color: '#ff5252', marginBottom: '4px' }}>2. Giá trị bị gian lận (Tampered Cookie):</div>
              <code style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                s:%7B%22username%22%3A%22HACKER_ADMIN%22%7D.k8J3...zQ9x (Chữ ký cũ)
              </code>
              <div style={{ fontSize: '0.8rem', color: '#ff5252', marginTop: '4px' }}>
                => Expected HMAC != Signature => Lỗi 401: COOKIE_TAMPERING_DETECTED!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENT LOG */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} color="var(--cookie-amber)" />
          Nhật Ký Tương Tác Cookie Console
        </h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          {logs.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
              Chưa có thao tác nào. Hãy nhấn nút "1. Đăng Nhập" bên trên để bắt đầu!
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  fontSize: '0.85rem'
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', minWidth: '70px' }}>{log.time}</span>
                <span className={log.type === 'SUCCESS' ? 'badge badge-green' : log.type === 'TAMPER' ? 'badge badge-red' : 'badge badge-amber'}>
                  {log.type}
                </span>
                <span style={{ color: 'var(--text-main)' }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
