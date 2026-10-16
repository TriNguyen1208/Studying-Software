import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  ArrowRight, 
  UserCheck, 
  LogOut,
  Fingerprint,
  Eye,
  FileCode
} from 'lucide-react';

const API_BASE = 'http://localhost:4004';

export default function App() {
  const [stage, setStage] = useState(1);
  const [params, setParams] = useState(null);
  const [simulateTamper, setSimulateTamper] = useState(false);
  const [callbackCode, setCallbackCode] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState([]);

  // Check current session
  const checkSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setStage(4);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Step 1: Khởi tạo thông số OAuth2 (State, PKCE)
  const handleInitiateOAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google/url`, { credentials: 'include' });
      const data = await res.json();
      setParams(data);
      setStage(2);
    } catch (err) {
      setErrorMsg('Không thể kết nối Backend OAuth: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Mô phỏng người dùng đồng ý cấp quyền trên Google Consent Screen
  const handleUserConsent = () => {
    setLoading(true);
    // Giả lập redirect từ Google trả về mã authorization code
    setTimeout(() => {
      const mockCode = 'auth_code_' + Math.random().toString(36).substring(2, 12);
      setCallbackCode(mockCode);
      setStage(3);
      setLoading(false);
    }, 600);
  };

  // Step 3: Trao đổi mã (Token Exchange) qua Backend
  const handleTokenExchange = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: callbackCode,
          state: simulateTamper ? 'HACKER_ATTACK_MALICIOUS_STATE' : params.state,
          codeVerifier: params.codeVerifier,
          simulateStateTampering: simulateTamper
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Token exchange thất bại');
      }

      setAuthData(data);
      setCurrentUser(data.user);
      setStage(4);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Refresh Token Rotation
  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setRefreshHistory(prev => [data, ...prev]);
      } else {
        setErrorMsg('Lỗi khi refresh token: ' + JSON.stringify(data));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Đăng xuất
  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    setCurrentUser(null);
    setAuthData(null);
    setParams(null);
    setCallbackCode(null);
    setStage(1);
    setRefreshHistory([]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#f3f4f6', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1f2937', paddingBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              OAuth 2.0 & Google Authentication Deep Dive
            </h1>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
            Authorization Code Flow • PKCE (RFC 7636) • CSRF State Shield • OpenID Connect (ID Token) • Refresh Token Rotation
          </p>
        </div>

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111827', border: '1px solid #374151', padding: '8px 16px', borderRadius: '10px' }}>
            <img src={currentUser.picture} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser.name}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{currentUser.email}</div>
            </div>
            <button 
              onClick={handleLogout}
              style={{ background: '#374151', border: 'none', color: '#f87171', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
            >
              <LogOut size={14} /> Thoát
            </button>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: '#fef2f2', padding: '14px 18px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color="#fca5a5" />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{errorMsg}</div>
        </div>
      )}

      {/* Step Progress Tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { num: 1, title: '1. Sinh State & PKCE', desc: 'Bảo mật Client & SPA' },
          { num: 2, title: '2. Google Consent Screen', desc: 'Resource Owner cấp quyền' },
          { num: 3, title: '3. Token Exchange', desc: 'Đổi Code lấy Token an toàn' },
          { num: 4, title: '4. Verified Identity & Session', desc: 'ID Token & Cookie Session' }
        ].map((s) => (
          <div 
            key={s.num} 
            style={{ 
              background: stage === s.num ? '#1e1b4b' : '#111827', 
              border: `1px solid ${stage === s.num ? '#6366f1' : '#1f2937'}`, 
              borderRadius: '10px', 
              padding: '14px',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                background: stage > s.num ? '#10b981' : stage === s.num ? '#6366f1' : '#374151',
                color: '#fff',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {stage > s.num ? '✓' : s.num}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: stage === s.num ? '#c7d2fe' : '#e5e7eb' }}>{s.title}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', paddingLeft: '28px' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Main Interactive Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        
        {/* Left Column: Interactive Stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Stage 1 Card */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Key size={20} color="#60a5fa" />
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Bước 1: Khởi tạo Yêu cầu Ủy quyền (Authorization Request)</h2>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>
              Client khởi tạo bộ tham số mật mã để ngăn ngừa tấn công chiếm quyền.
            </p>

            <button 
              onClick={handleInitiateOAuth}
              disabled={loading || stage > 1}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Fingerprint size={16} /> Bắt đầu luồng OAuth 2.0 (Sinh State & PKCE)
            </button>

            {params && (
              <div style={{ marginTop: '16px', background: '#030712', border: '1px solid #374151', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>State (CSRF Token): </span>
                  <span style={{ color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>{params.state}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>PKCE code_verifier (Bí mật ở Memory): </span>
                  <span style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>{params.codeVerifier.substring(0, 24)}...</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>PKCE code_challenge (Gửi lên Google): </span>
                  <span style={{ color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>{params.codeChallenge}</span>
                </div>
              </div>
            )}
          </div>

          {/* Stage 2 Card: Google Consent Screen */}
          {stage >= 2 && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <ExternalLink size={20} color="#34d399" />
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Bước 2: Màn hình Xác thực Google (Consent Screen)</h2>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>
                Người dùng chuyển hướng tới <code>accounts.google.com</code> để xác thực và chấp thuận các Scopes: <code>openid</code>, <code>email</code>, <code>profile</code>.
              </p>

              {/* Security Attack Simulation Toggle */}
              <div style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fca5a5' }}>
                  <input 
                    type="checkbox" 
                    checked={simulateTamper} 
                    onChange={e => setSimulateTamper(e.target.checked)} 
                  />
                  <span>⚠️ Mô phỏng tấn công CSRF (Giả mạo / làm sai lệch tham số State)</span>
                </label>
              </div>

              <button 
                onClick={handleUserConsent}
                disabled={loading || stage > 2}
                style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle2 size={16} /> Người dùng bấm "Chấp thuận Quyền" trên Google
              </button>
            </div>
          )}

          {/* Stage 3 Card: Token Exchange */}
          {stage >= 3 && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Lock size={20} color="#f59e0b" />
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Bước 3: Trao đổi mã qua Back-channel (Token Exchange)</h2>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>
                Google trả về <code>Authorization Code</code>. Backend bí mật gửi Code + PKCE <code>code_verifier</code> lên Google Token Endpoint để nhận Tokens.
              </p>

              <div style={{ background: '#030712', border: '1px solid #374151', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                <span style={{ color: '#9ca3af' }}>Authorization Code nhận được: </span>
                <span style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{callbackCode}</span>
              </div>

              <button 
                onClick={handleTokenExchange}
                disabled={loading || stage > 3}
                style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowRight size={16} /> Gửi Token Exchange Request tới Backend
              </button>
            </div>
          )}

        </div>

        {/* Right Column: JWT Token Inspector & Session Telemetry */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <FileCode size={20} color="#a855f7" />
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Token Inspector & Verified Claims</h2>
          </div>

          {authData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              
              {/* ID Token Decoded Claims */}
              <div style={{ background: '#030712', border: '1px solid #374151', borderRadius: '8px', padding: '14px' }}>
                <div style={{ color: '#a855f7', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                  Decoded ID Token (OIDC Claims)
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div><strong>iss:</strong> <span style={{ color: '#34d399' }}>{authData.rawTokens.decodedClaims.iss}</span></div>
                  <div><strong>sub (Google ID):</strong> <span style={{ color: '#38bdf8' }}>{authData.rawTokens.decodedClaims.sub}</span></div>
                  <div><strong>aud:</strong> <span style={{ color: '#fbbf24' }}>{authData.rawTokens.decodedClaims.aud.substring(0, 25)}...</span></div>
                  <div><strong>email:</strong> {authData.rawTokens.decodedClaims.email}</div>
                  <div><strong>name:</strong> {authData.rawTokens.decodedClaims.name}</div>
                  <div><strong>email_verified:</strong> <span style={{ color: '#10b981' }}>true</span></div>
                </div>
              </div>

              {/* Raw Tokens */}
              <div style={{ background: '#030712', border: '1px solid #374151', borderRadius: '8px', padding: '14px' }}>
                <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>
                  Access Token (Bearer API Calls)
                </div>
                <div style={{ wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace', color: '#9ca3af', fontSize: '11px' }}>
                  {authData.rawTokens.accessToken}
                </div>
              </div>

              {/* Refresh Token & Rotation Action */}
              <div style={{ background: '#030712', border: '1px solid #374151', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '13px' }}>Refresh Token (Long-lived)</div>
                  <button 
                    onClick={handleRefreshToken}
                    disabled={loading}
                    style={{ background: '#374151', color: '#fbbf24', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Rotate Token
                  </button>
                </div>
                <div style={{ wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace', color: '#9ca3af', fontSize: '11px' }}>
                  {authData.rawTokens.refreshToken}
                </div>
              </div>

              {/* Refresh History Log */}
              {refreshHistory.length > 0 && (
                <div style={{ background: '#1f2937', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, marginBottom: '6px' }}>✓ Token Rotation History:</div>
                  {refreshHistory.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>
                      rotated: {item.newAccessToken.substring(0, 24)}...
                    </div>
                  ))}
                </div>
              )}

            </div>
          ) : (
            <div style={{ background: '#030712', border: '1px dashed #374151', borderRadius: '8px', padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
              Hoàn thành các bước đăng nhập ở cột bên trái để phân tích Tokens và JWT Claims trực tiếp.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
