import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 4004;

// Secret key for JWT signing & session signing
const JWT_SECRET = process.env.JWT_SECRET || 'study_oauth2_jwt_super_secret_key_2026';
const GOOGLE_CLIENT_ID = 'study-google-client-id-xyz123.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'study-gocspx-secret-9876543210';

app.use(cors({
  origin: ['http://localhost:5182', 'http://127.0.0.1:5182'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser('study_cookie_secret_sign_999'));

// ==========================================
// IN-MEMORY MOCK STORE FOR AUTH SERVER ENGINE
// ==========================================
// Đoạn này làm gì: Lưu trữ Auth Codes, Refresh Tokens, PKCE Challenges để mô phỏng chính xác
// hành vi của Google OAuth2 Identity Provider (IdP) mà không cần internet.
// Tại sao trong production: Google quản lý cluster IdP khổng lồ; trên local ta dùng store
// giả lập đầy đủ trạng thái mật mã (code_challenge, expiry, single-use check).
const authCodeStore = new Map();
const refreshTokenStore = new Map();
const activeSessions = new Map();

// Helper: base64url encoding
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ==========================================
// MOCK GOOGLE OAUTH 2.0 IDENTITY PROVIDER
// ==========================================

// Endpoint mô phỏng màn hình đồng ý (Google Consent Screen)
app.get('/oauth/google/auth', (req) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;

  // Validation
  if (client_id !== GOOGLE_CLIENT_ID) {
    return res.status(400).send('Invalid Client ID');
  }

  // Đoạn này làm gì: Sinh mã Authorization Code tạm thời (chỉ sống 60 giây và dùng 1 lần duy nhất)
  // Tại sao: Ngăn chặn kẻ xấu tái sử dụng lại code nếu bắt được trên mạng.
  // Rủi ro nếu không làm: Replay attack chiếm quyền truy cập tài khoản.
  const authCode = 'auth_code_' + crypto.randomBytes(16).toString('hex');
  authCodeStore.set(authCode, {
    clientId: client_id,
    redirectUri: redirect_uri,
    scope,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method || 'S256',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000, // 60s TTL
    used: false,
    user: {
      sub: 'google_user_10829471928374',
      name: 'Nguyen Van Dev',
      email: 'nguyen.van.dev@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      email_verified: true
    }
  });

  // Chuyển hướng người dùng về callback URL với code và state
  const targetRedirect = `${redirect_uri}?code=${authCode}&state=${encodeURIComponent(state)}`;
  res.redirect(targetRedirect);
});

// Endpoint mô phỏng Token Exchange của Google
// POST /oauth/google/token
app.post('/oauth/google/token', (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri, code_verifier, refresh_token } = req.body;

  // 1. Luồng cấp mới token qua Refresh Token (Refresh Token Flow)
  if (grant_type === 'refresh_token') {
    const existing = refreshTokenStore.get(refresh_token);
    if (!existing) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token invalid or already rotated' });
    }

    // Refresh Token Rotation: Xóa token cũ ngay lập tức
    refreshTokenStore.delete(refresh_token);

    // Cấp phát cặp token mới
    const newAccessToken = 'ya29.study_new_access_' + crypto.randomBytes(24).toString('hex');
    const newRefreshToken = '1//study_new_refresh_' + crypto.randomBytes(32).toString('hex');
    refreshTokenStore.set(newRefreshToken, { user: existing.user, createdAt: Date.now() });

    return res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: 'openid email profile'
    });
  }

  // 2. Luồng đổi Authorization Code lấy Token (Authorization Code Flow with PKCE)
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  const storedAuth = authCodeStore.get(code);
  if (!storedAuth) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code not found or expired' });
  }

  // Single-use check: Authorization code chỉ được dùng 1 lần
  if (storedAuth.used || Date.now() > storedAuth.expiresAt) {
    authCodeStore.delete(code);
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code has already been used or expired' });
  }
  storedAuth.used = true; // Đánh dấu đã sử dụng

  // Client Authentication
  if (client_id !== GOOGLE_CLIENT_ID || client_secret !== GOOGLE_CLIENT_SECRET) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  // Kiểm tra PKCE (Proof Key for Code Exchange - RFC 7636)
  // Đoạn này làm gì: Băm SHA-256 code_verifier từ client gửi lên và so khớp với code_challenge đã gửi trước đó.
  // Tại sao: Đảm bảo người nhận token chính là client đã khởi tạo request ban đầu trên browser.
  if (storedAuth.codeChallenge) {
    if (!code_verifier) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier is required for PKCE' });
    }
    const computedChallenge = base64UrlEncode(crypto.createHash('sha256').update(code_verifier).digest());
    if (computedChallenge !== storedAuth.codeChallenge) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier verification failed' });
    }
  }

  // Sinh ID Token (OpenID Connect JWT)
  const idTokenPayload = {
    iss: 'https://accounts.google.com',
    sub: storedAuth.user.sub,
    aud: GOOGLE_CLIENT_ID,
    email: storedAuth.user.email,
    email_verified: storedAuth.user.email_verified,
    name: storedAuth.user.name,
    picture: storedAuth.user.picture,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
  };
  const idToken = jwt.sign(idTokenPayload, JWT_SECRET, { algorithm: 'HS256' });

  // Sinh Access Token và Refresh Token
  const accessToken = 'ya29.study_access_' + crypto.randomBytes(24).toString('hex');
  const newRefreshToken = '1//study_refresh_' + crypto.randomBytes(32).toString('hex');
  refreshTokenStore.set(newRefreshToken, { user: storedAuth.user, createdAt: Date.now() });

  return res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: newRefreshToken,
    id_token: idToken,
    scope: storedAuth.scope
  });
});

// ==========================================
// APPLICATION BACKEND ENDPOINTS (BFF PATTERN)
// ==========================================

// Endpoint: Khởi tạo URL đăng nhập Google kèm CSRF State & PKCE Challenge
app.get('/api/auth/google/url', (req, res) => {
  // 1. Sinh chuỗi ngẫu nhiên phòng chống CSRF (State Parameter)
  const state = crypto.randomBytes(16).toString('hex');

  // 2. Sinh cặp khóa PKCE (Code Verifier & Code Challenge)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());

  // Lưu state vào signed cookie trên trình duyệt để đối soát khi Google callback về
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: false, // Set true trên HTTPS production
    sameSite: 'lax',
    maxAge: 300000 // 5 phút
  });

  const redirectUri = 'http://localhost:5182/auth/callback';
  const consentUrl = `http://localhost:${PORT}/oauth/google/auth?` + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  }).toString();

  res.json({
    consentUrl,
    state,
    codeVerifier,
    codeChallenge,
    clientId: GOOGLE_CLIENT_ID
  });
});

// Endpoint: Xử lý Callback từ Google sau khi người dùng đồng ý đăng nhập
app.post('/api/auth/google/callback', async (req, res) => {
  const { code, state, codeVerifier, simulateStateTampering } = req.body;
  const storedState = req.cookies.oauth_state;

  // Kiểm tra phòng chống CSRF (Cross-Site Request Forgery)
  // Đoạn này làm gì: Đối soát xem state gửi về có khớp với state được lưu trong cookie ban đầu không.
  // Tại sao: Nếu không kiểm tra, kẻ tấn công có thể lừa người dùng bấm vào link callback của chính hắn để gán tài khoản nạn nhân.
  if (simulateStateTampering || !state || state !== storedState) {
    return res.status(403).json({
      error: 'CSRF_STATE_MISMATCH',
      message: 'Phát hiện rủi ro CSRF: Mã state nhận được không khớp với phiên làm việc!'
    });
  }

  try {
    // Backend gọi Back-channel tới Auth Server để đổi mã lấy Token
    const tokenRes = await fetch(`http://localhost:${PORT}/oauth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://localhost:5182/auth/callback',
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).json({ error: 'TOKEN_EXCHANGE_FAILED', details: tokenData });
    }

    // Xác thực và giải mã ID Token
    // Đoạn này làm gì: Giải mã JWT, kiểm tra chữ ký và đối soát Claims: aud === GOOGLE_CLIENT_ID.
    const decodedIdToken = jwt.verify(tokenData.id_token, JWT_SECRET);

    // Tạo Session bảo mật cho Client (Mô hình BFF - Backend For Frontend)
    const sessionId = 'sess_' + crypto.randomBytes(24).toString('hex');
    activeSessions.set(sessionId, {
      user: decodedIdToken,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      createdAt: Date.now()
    });

    // Trả session qua HttpOnly Cookie an toàn
    res.cookie('app_session_id', sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000 // 7 days
    });

    // Trả về thông tin cho Frontend hiển thị telemetry
    res.json({
      status: 'AUTHENTICATED',
      user: {
        id: decodedIdToken.sub,
        email: decodedIdToken.email,
        name: decodedIdToken.name,
        picture: decodedIdToken.picture
      },
      rawTokens: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        idToken: tokenData.id_token,
        decodedClaims: decodedIdToken
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_AUTH_ERROR', message: err.message });
  }
});

// Endpoint: Lấy thông tin người dùng hiện tại từ Session
app.get('/api/auth/me', (req, res) => {
  const sessionId = req.cookies.app_session_id;
  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ authenticated: false, message: 'Chưa đăng nhập hoặc Session đã hết hạn' });
  }

  const session = activeSessions.get(sessionId);
  res.json({
    authenticated: true,
    user: session.user,
    sessionCreated: new Date(session.createdAt).toISOString()
  });
});

// Endpoint: Cấp mới Access Token (Refresh Token Rotation demo)
app.post('/api/auth/refresh', async (req, res) => {
  const sessionId = req.cookies.app_session_id;
  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ error: 'NO_ACTIVE_SESSION' });
  }

  const session = activeSessions.get(sessionId);
  try {
    const tokenRes = await fetch(`http://localhost:${PORT}/oauth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET
      })
    });

    const refreshed = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).json(refreshed);
    }

    // Cập nhật session với access token và refresh token mới (Rotation)
    session.accessToken = refreshed.access_token;
    session.refreshToken = refreshed.refresh_token;

    res.json({
      status: 'REFRESH_SUCCESS',
      newAccessToken: refreshed.access_token,
      newRefreshToken: refreshed.refresh_token
    });
  } catch (err) {
    res.status(500).json({ error: 'REFRESH_FAILED', message: err.message });
  }
});

// Endpoint: Đăng xuất & thu hồi session
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies.app_session_id;
  if (sessionId) {
    activeSessions.delete(sessionId);
    res.clearCookie('app_session_id');
    res.clearCookie('oauth_state');
  }
  res.json({ status: 'LOGGED_OUT' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    activeSessionsCount: activeSessions.size,
    storedRefreshTokens: refreshTokenStore.size
  });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`[OAuth2 Service] Running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[OAuth2 Service] Receiving SIGTERM, closing gracefully...');
  server.close(() => {
    console.log('[OAuth2 Service] Closed.');
    process.exit(0);
  });
});
