import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Lock, Unlock, AlertTriangle, 
  Terminal, Database, Globe, Key, RefreshCw, Zap, Server
} from 'lucide-react';

const API_BASE = 'http://localhost:3003';

export default function App() {
  const [activeTab, setActiveTab] = useState('xss');
  const [serverStatus, setServerStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  // States cho các kịch bản
  const [currentUser, setCurrentUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [cookiesVisible, setCookiesVisible] = useState('');

  // 1. XSS / Auth Form
  const [loginUser, setLoginUser] = useState('alice');
  const [loginPass, setLoginPass] = useState('password123');

  // 2. CSRF
  const [transferAmount, setTransferAmount] = useState(500);
  const [transferTo, setTransferTo] = useState('hacker_wallet');
  const [csrfDefenseMode, setCsrfDefenseMode] = useState('secure');

  // 3. SQLi
  const [sqliPayload, setSqliPayload] = useState("admin' OR '1'='1");
  const [sqliMode, setSqliMode] = useState('vulnerable');

  // 4. IDOR
  const [orderIdToFetch, setOrderIdToFetch] = useState('ord_102'); // Đơn của Bob
  const [idorMode, setIdorMode] = useState('vulnerable');

  // 5. SSRF
  const [ssrfUrl, setSsrfUrl] = useState('http://169.254.169.254/latest/meta-data/');
  const [ssrfMode, setSsrfMode] = useState('vulnerable');

  // 6. Rate Limit
  const [rateLimitCounter, setRateLimitCounter] = useState(0);

  const addLog = (title, data, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ id: Date.now(), timestamp, title, data, isError }, ...prev.slice(0, 19)]);
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const data = await res.json();
      setServerStatus(data);
    } catch {
      setServerStatus({ status: 'offline' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshCookies = () => {
    setCookiesVisible(document.cookie || '(Trống - Không có cookie nào đọc được bằng JS)');
  };

  // 1. Handle Login
  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setCsrfToken(data.csrfToken);
        addLog('ĐĂNG NHẬP THÀNH CÔNG', data);
        refreshCookies();
      } else {
        addLog('ĐĂNG NHẬP THẤT BẠI', data, true);
      }
    } catch (e) {
      addLog('LỖI KẾT NỐI SERVER', e.message, true);
    }
  };

  // 2. Handle Transfer (CSRF Demo)
  const handleTransfer = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (csrfDefenseMode === 'secure') {
        headers['X-CSRF-Token'] = csrfToken;
      }
      const res = await fetch(`${API_BASE}/api/transfer`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          toAccount: transferTo,
          amount: transferAmount,
          csrfToken: csrfDefenseMode === 'secure' ? csrfToken : undefined,
          defenseMode: csrfDefenseMode
        })
      });
      const data = await res.json();
      if (data.success) {
        if (currentUser) {
          setCurrentUser(prev => ({ ...prev, balance: data.currentBalance }));
        }
        addLog('GIAO DỊCH CHUYỂN TIỀN THÀNH CÔNG', data);
      } else {
        addLog('GIAO DỊCH BỊ CHẶN BỞI CSRF DEFENSE', data, true);
      }
    } catch (e) {
      addLog('LỖI KẾT NỐI CHUYỂN TIỀN', e.message, true);
    }
  };

  // 3. Handle SQLi
  const handleSearchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: sqliMode, payload: sqliPayload })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`SQL QUERY KẾT QUẢ [${sqliMode.toUpperCase()}]`, data);
      } else {
        addLog(`SQLI INPUT BỊ TỪ CHỐI [${sqliMode.toUpperCase()}]`, data, true);
      }
    } catch (e) {
      addLog('LỖI SEARCH USER', e.message, true);
    }
  };

  // 4. Handle IDOR
  const handleFetchOrder = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderIdToFetch}?mode=${idorMode}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        addLog(`IDOR TEST KẾT QUẢ [${idorMode.toUpperCase()}]`, data);
      } else {
        addLog(`IDOR BỊ CHẶN BỞI CHECK OWNERSHIP [${idorMode.toUpperCase()}]`, data, true);
      }
    } catch (e) {
      addLog('LỖI TRUY VẤN ORDER', e.message, true);
    }
  };

  // 5. Handle SSRF
  const handleFetchUrl = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ssrf/fetch-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ssrfUrl, mode: ssrfMode })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`SSRF FETCH TEST [${ssrfMode.toUpperCase()}]`, data);
      } else {
        addLog(`SSRF BỊ CHẶN BỞI PRIVATE IP FILTER [${ssrfMode.toUpperCase()}]`, data, true);
      }
    } catch (e) {
      addLog('LỖI SSRF FETCH', e.message, true);
    }
  };

  // 6. Handle Rate Limit
  const handleRateLimitTest = async () => {
    try {
      setRateLimitCounter(c => c + 1);
      const res = await fetch(`${API_BASE}/api/rate-limit/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.status === 429) {
        addLog('429 RATE LIMIT EXCEEDED (CHẶN BRUTE-FORCE)', data, true);
      } else {
        addLog('REQUEST RATE LIMIT THÀNH CÔNG', data);
      }
    } catch (e) {
      addLog('LỖI RATE LIMIT TEST', e.message, true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f1f5f9', padding: '24px' }}>
      {/* HEADER BAR */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        borderBottom: '1px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #e11d48, #4f46e5)', 
            padding: '10px', borderRadius: '12px', display: 'flex' 
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Backend Security Lab & Defense Console
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Mô phỏng thực chiến OWASP Top 10: XSS, CSRF, SQLi, SSRF, IDOR & Rate Limiting
            </p>
          </div>
        </div>

        {/* Server & Redis Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '8px', 
            fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' 
          }}>
            <Server size={14} color={serverStatus?.status === 'online' ? '#10b981' : '#ef4444'} />
            <span>Backend: <strong>{serverStatus?.status || 'connecting...'}</strong></span>
            <span style={{ color: '#64748b' }}>|</span>
            <span>Redis: <strong>{serverStatus?.redis || 'n/a'}</strong></span>
          </div>
          {currentUser && (
            <div style={{ 
              backgroundColor: '#1e1b4b', border: '1px solid #4338ca', 
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', color: '#c7d2fe' 
            }}>
              Logged in: <strong>{currentUser.username}</strong> (${currentUser.balance})
            </div>
          )}
        </div>
      </header>

      {/* MAIN LAYOUT: 2 COLUMNS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '24px' }}>
        
        {/* LEFT COLUMN: INTERACTIVE LAB TABS */}
        <div>
          {/* TABS NAVIGATION */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '20px' }}>
            {[
              { id: 'xss', label: '1. XSS & HttpOnly', icon: Lock },
              { id: 'csrf', label: '2. CSRF & Tokens', icon: RefreshCw },
              { id: 'sqli', label: '3. SQL / NoSQL Injection', icon: Database },
              { id: 'idor', label: '4. IDOR / Authz', icon: Key },
              { id: 'ssrf', label: '5. SSRF Defense', icon: Globe },
              { id: 'ratelimit', label: '6. Rate Limiting', icon: Zap }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                    backgroundColor: isActive ? '#e11d48' : '#1e293b',
                    color: isActive ? '#ffffff' : '#94a3b8'
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: XSS & HTTPONLY COOKIE */}
          {activeTab === 'xss' && (
            <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#f43f5e' }}>
                XSS Defense: Cookie Cờ HttpOnly vs Cookie Thường
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                Khi đăng nhập, Server gửi về 2 Cookie: <code>insecure_token</code> (Không cờ HttpOnly) và <code>secure_jwt</code> (Có cờ HttpOnly).
                Thử nghiệm xem JavaScript trên trình duyệt (hoặc mã XSS độc hại) có thể đọc trộm được cookie nào qua <code>document.cookie</code>!
              </p>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input 
                  type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)}
                  placeholder="Username"
                  style={{ backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                />
                <input 
                  type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                  placeholder="Password"
                  style={{ backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                />
                <button
                  onClick={handleLogin}
                  style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Đăng Nhập Ngay
                </button>
              </div>

              {/* XSS Inspection Box */}
              <div style={{ backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '8px', padding: '14px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                    🔍 Trình duyệt: Dữ liệu đọc được từ <code>document.cookie</code> (Client-side JS)
                  </span>
                  <button 
                    onClick={refreshCookies}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Đọc lại
                  </button>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', color: '#fbbf24', wordBreak: 'break-all' }}>
                  {cookiesVisible || '(Bấm "Đọc lại" hoặc "Đăng nhập" để kiểm tra cookie trong RAM)'}
                </div>
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px' }}>
                  💡 <strong>Kết luận:</strong> Chỉ thấy <code>insecure_token</code>. Token thật sự <code>secure_jwt</code> đã được trình duyệt giấu kín hoàn toàn khỏi JavaScript nhờ <code>HttpOnly</code>. Hacker dù chèn được script XSS cũng không thể đánh cắp!
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CSRF */}
          {activeTab === 'csrf' && (
            <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#f59e0b' }}>
                CSRF Defense: Anti-CSRF Token & SameSite Cookie
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                CSRF lợi dụng việc trình duyệt tự động gửi kèm Cookie khi tạo request. Nếu Backend không kiểm tra Anti-CSRF Token hoặc không có SameSite, một trang web độc hại có thể bí mật trừ tiền trong tài khoản của bạn!
              </p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="csrfMode" value="vulnerable" 
                    checked={csrfDefenseMode === 'vulnerable'} 
                    onChange={e => setCsrfDefenseMode(e.target.value)} 
                  />
                  <span style={{ color: '#ef4444' }}>❌ Không bật Anti-CSRF (Dễ bị tấn công)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="csrfMode" value="secure" 
                    checked={csrfDefenseMode === 'secure'} 
                    onChange={e => setCsrfDefenseMode(e.target.value)} 
                  />
                  <span style={{ color: '#10b981' }}>✅ Bật Anti-CSRF Token (Phòng thủ chuẩn)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                <input 
                  type="text" value={transferTo} onChange={e => setTransferTo(e.target.value)}
                  placeholder="Chuyển đến tài khoản..."
                  style={{ backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                />
                <input 
                  type="number" value={transferAmount} onChange={e => setTransferAmount(Number(e.target.value))}
                  placeholder="Số tiền"
                  style={{ width: '100px', backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                />
                <button
                  onClick={handleTransfer}
                  style={{ backgroundColor: '#f59e0b', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Thực Hiện Chuyển Tiền
                </button>
              </div>

              <div style={{ backgroundColor: '#0b0f19', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                <div style={{ color: '#94a3b8' }}>Token CSRF hiện tại của phiên:</div>
                <code style={{ color: '#38bdf8' }}>{csrfToken || '(Chưa đăng nhập - Vui lòng qua Tab 1 đăng nhập trước)'}</code>
              </div>
            </div>
          )}

          {/* TAB 3: SQL / NoSQL INJECTION */}
          {activeTab === 'sqli' && (
            <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#38bdf8' }}>
                SQL & NoSQL Injection Defense: Prepared Statement vs String Concat
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                Thử nghiệm gửi chuỗi khai thác kinh điển <code>admin' OR '1'='1</code> để xem sự khác biệt giữa phép ghép chuỗi thô sơ và cơ chế Parameterized Query kết hợp Type Validation bằng Zod.
              </p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="sqliMode" value="vulnerable" 
                    checked={sqliMode === 'vulnerable'} 
                    onChange={e => setSqliMode(e.target.value)} 
                  />
                  <span style={{ color: '#ef4444' }}>❌ Ghép chuỗi SQL trực tiếp (Vulnerable)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="sqliMode" value="secure" 
                    checked={sqliMode === 'secure'} 
                    onChange={e => setSqliMode(e.target.value)} 
                  />
                  <span style={{ color: '#10b981' }}>✅ Parameterized Query + Zod (Secure)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input 
                  type="text" value={sqliPayload} onChange={e => setSqliPayload(e.target.value)}
                  style={{ flex: 1, backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fbbf24', fontFamily: 'monospace', fontSize: '13px' }}
                />
                <button
                  onClick={handleSearchUser}
                  style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Chạy Truy Vấn
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setSqliPayload("admin' OR '1'='1")}
                  style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Mẫu: admin' OR '1'='1
                </button>
                <button 
                  onClick={() => setSqliPayload("alice")}
                  style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Mẫu: alice (Hợp lệ)
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: IDOR */}
          {activeTab === 'idor' && (
            <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#a855f7' }}>
                IDOR / BOLA Defense: Phân Quyền Hạt Mịn (Fine-Grained Authorization)
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                Bạn đang đăng nhập với tư cách <strong>Alice</strong> (Sở hữu đơn <code>ord_101</code>). Đơn <code>ord_102</code> thuộc về <strong>Bob</strong>. 
                Thử truy cập đơn hàng của Bob xem Backend có kiểm tra quyền sở hữu không!
              </p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="idorMode" value="vulnerable" 
                    checked={idorMode === 'vulnerable'} 
                    onChange={e => setIdorMode(e.target.value)} 
                  />
                  <span style={{ color: '#ef4444' }}>❌ Không kiểm tra quyền sở hữu (Chỉ WHERE id)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="idorMode" value="secure" 
                    checked={idorMode === 'secure'} 
                    onChange={e => setIdorMode(e.target.value)} 
                  />
                  <span style={{ color: '#10b981' }}>✅ Kiểm tra sở hữu (WHERE id AND userId)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <select 
                  value={orderIdToFetch} onChange={e => setOrderIdToFetch(e.target.value)}
                  style={{ backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="ord_101">Đơn ord_101 (Của Alice - Chính bạn)</option>
                  <option value="ord_102">Đơn ord_102 (Của Bob - Xem trộm)</option>
                  <option value="ord_103">Đơn ord_103 (Của Admin - Xem trộm)</option>
                </select>
                <button
                  onClick={handleFetchOrder}
                  style={{ backgroundColor: '#9333ea', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Tải Chi Tiết Đơn Hàng
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SSRF */}
          {activeTab === 'ssrf' && (
            <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#ec4899' }}>
                SSRF Defense: Chặn Dải IP Nội Bộ & Cloud Metadata (169.254.169.254)
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                Khi server có chức năng "Tải ảnh từ URL" hoặc "Preview Link", kẻ xấu có thể gửi địa chỉ AWS Metadata nội bộ để cướp AccessKey/SecretKey của máy chủ đám mây!
              </p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="ssrfMode" value="vulnerable" 
                    checked={ssrfMode === 'vulnerable'} 
                    onChange={e => setSsrfMode(e.target.value)} 
                  />
                  <span style={{ color: '#ef4444' }}>❌ Cho phép tải mọi URL không lọc IP</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" name="ssrfMode" value="secure" 
                    checked={ssrfMode === 'secure'} 
                    onChange={e => setSsrfMode(e.target.value)} 
                  />
                  <span style={{ color: '#10b981' }}>✅ Chặn Private IP & Metadata 169.254</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input 
                  type="text" value={ssrfUrl} onChange={e => setSsrfUrl(e.target.value)}
                  style={{ flex: 1, backgroundColor: '#0b0f19', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#fbbf24', fontFamily: 'monospace', fontSize: '13px' }}
                />
                <button
                  onClick={handleFetchUrl}
                  style={{ backgroundColor: '#db2777', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Server Fetch URL
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setSsrfUrl('http://169.254.169.254/latest/meta-data/')}
                  style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                >
                  AWS Metadata (169.254.169.254)
                </button>
                <button 
                  onClick={() => setSsrfUrl('http://127.0.0.1:6379')}
                  style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Localhost Redis (127.0.0.1)
                </button>
                <button 
                  onClick={() => setSsrfUrl('https://api.github.com')}
                  style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Public URL An Toàn
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: RATE LIMITING */}
          {activeTab === 'ratelimit' && (
            <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#10b981' }}>
                Rate Limiting: Chống Brute-Force & DoS với Sliding Window Redis
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.6 }}>
                Endpoint này được giới hạn nghiêm ngặt: <strong>Tối đa 5 request / phút</strong>.
                Bấm spam nút bên dưới để xem hệ thống kích hoạt mã HTTP <code>429 Too Many Requests</code> và chặn đứng tiến trình tấn công!
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <button
                  onClick={handleRateLimitTest}
                  style={{ 
                    backgroundColor: '#10b981', color: '#000', border: 'none', 
                    padding: '10px 20px', borderRadius: '8px', fontWeight: 800, 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                  }}
                >
                  <Zap size={16} /> Bấm Gửi Request (Đã bấm: {rateLimitCounter} lần)
                </button>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Giới hạn: 5 req / phút. Lần thứ 6 sẽ bị chặn ngay lập tức.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REAL-TIME AUDIT LOG VIEWER */}
        <div style={{ 
          backgroundColor: '#070b14', border: '1px solid #1e293b', borderRadius: '12px', 
          display: 'flex', flexDirection: 'column', height: '620px' 
        }}>
          {/* Log Header */}
          <div style={{ 
            padding: '12px 16px', borderBottom: '1px solid #1e293b', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
              <Terminal size={16} color="#38bdf8" />
              <span>Real-Time Security Audit Log</span>
            </div>
            <button
              onClick={() => setLogs([])}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear Logs
            </button>
          </div>

          {/* Log Stream */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '100px' }}>
                Chưa có thao tác nào. Hãy thực hiện các bài test bên trái để xem luồng dữ liệu bảo mật!
              </div>
            ) : (
              logs.map(log => (
                <div 
                  key={log.id}
                  style={{ 
                    backgroundColor: log.isError ? '#2a0e16' : '#0d1527',
                    borderLeft: `4px solid ${log.isError ? '#f43f5e' : '#10b981'}`,
                    borderRadius: '4px', padding: '10px', fontSize: '12px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: log.isError ? '#fb7185' : '#34d399' }}>
                      {log.title}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{log.timestamp}</span>
                  </div>
                  <pre style={{ 
                    margin: 0, padding: '6px', backgroundColor: '#020617', borderRadius: '4px', 
                    color: '#e2e8f0', fontSize: '11px', overflowX: 'auto', fontFamily: 'monospace' 
                  }}>
                    {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
