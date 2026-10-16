/**
 * ==============================================================================
 * PRODUCTION-GRADE BACKEND WEB SECURITY LAB SERVICE
 * ==============================================================================
 * Dịch vụ minh chứng trực quan các kỹ thuật phòng thủ bảo mật backend:
 * 1. XSS Defense (HttpOnly Cookie, CSP Headers, Sanitization)
 * 2. CSRF Defense (SameSite Cookie vs Insecure Cookie, Anti-CSRF Token)
 * 3. SQLi / NoSQLi Defense (Parameterized query mock vs String Concat, Type validation via Zod)
 * 4. SSRF Defense (Private IP blacklisting, Localhost block, Cloud Metadata 169.254 block)
 * 5. IDOR Defense (Ownership verification vs Insecure object reference)
 * 6. Rate Limiting (Redis-backed sliding window rate limiter)
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
const Redis = require('ioredis');

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_signing_key_production_grade_12345';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// ------------------------------------------------------------------------------
// REDIS CONNECTION (Với Connection Retry & Error Handling an toàn)
// ------------------------------------------------------------------------------
let redisClient = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // Không spam reconnect nếu redis chưa bật
      return Math.min(times * 200, 1000);
    }
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('[Security Lab] Kết nối Redis thành công.');
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    console.warn('[Security Lab] Redis không khả dụng, chuyển sang fallback memory:', err.message);
  });
} catch (e) {
  console.warn('[Security Lab] Khởi tạo Redis lỗi, dùng fallback memory');
}

// ------------------------------------------------------------------------------
// GLOBAL MIDDLEWARES
// ------------------------------------------------------------------------------
// 1. Helmet: Thiết lập các HTTP Security Headers chuẩn mực
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3003", "http://127.0.0.1:3003", "http://localhost:5177"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS Whitelist với credentials
const ALLOWED_ORIGINS = [
  'http://localhost:5177',
  'http://127.0.0.1:5177',
  'http://localhost:3003'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Chặn bởi chính sách CORS (Not allowed by CORS policy)'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '10kb' })); // Chặn payload JSON khổng lồ làm nghẽn RAM (DoS)
app.use(cookieParser());

// ------------------------------------------------------------------------------
// GIẢ LẬP CƠ SỞ DỮ LIỆU IN-MEMORY (DATABASE MOCK)
// ------------------------------------------------------------------------------
const DB_USERS = [
  { id: 'usr_alice', username: 'alice', password: 'password123', balance: 5000, role: 'user' },
  { id: 'usr_bob', username: 'bob', password: 'secretpassword', balance: 200, role: 'user' },
  { id: 'usr_admin', username: 'admin', password: 'superadminpassword', balance: 100000, role: 'admin' }
];

const DB_ORDERS = [
  { id: 'ord_101', userId: 'usr_alice', item: 'MacBook Pro M3 Max', amount: 3500, status: 'shipped' },
  { id: 'ord_102', userId: 'usr_bob', item: 'Mechanical Keyboard', amount: 150, status: 'delivered' },
  { id: 'ord_103', userId: 'usr_admin', item: 'Server Rack 42U', amount: 12000, status: 'processing' }
];

// Anti-CSRF Token Store (in-memory demo)
const CSRF_TOKENS = new Map();

// ------------------------------------------------------------------------------
// RATE LIMITER MIDDLEWARE (Dùng Redis nếu có, fallback Memory)
// ------------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 5, // Tối đa 5 request / phút cho endpoint test rate limit
  message: {
    success: false,
    error: '429 Too Many Requests: Bạn đã thử quá 5 lần trong 1 phút! Hệ thống đã kích hoạt khóa tạm thời để chống Brute-Force.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: isRedisAvailable && redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }) : undefined
});

// ------------------------------------------------------------------------------
// API ENDPOINTS MINH HỌA BẢO MẬT
// ------------------------------------------------------------------------------

/**
 * 0. KIỂM TRA TRẠNG THÁI SERVER
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    redis: isRedisAvailable ? 'connected' : 'in-memory fallback'
  });
});

/**
 * 1. PHÒNG THỦ XSS: Đăng nhập & So sánh Cookie Thường vs HttpOnly Cookie
 */
app.post('/api/auth/login', (req, res) => {
  const { username = 'alice', password = 'password123' } = req.body;
  const user = DB_USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Sai tài khoản hoặc mật khẩu' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

  // Sinh CSRF token ngẫu nhiên
  const csrfToken = 'csrf_' + Math.random().toString(36).substring(2) + Date.now();
  CSRF_TOKENS.set(user.id, csrfToken);

  // A. VULNERABLE COOKIE (Không có HttpOnly -> document.cookie ở Frontend đọc được dễ dàng)
  res.cookie('insecure_token', token, {
    httpOnly: false,
    path: '/'
  });

  // B. SECURE COOKIE (Có HttpOnly -> Trình duyệt khóa chặt, JavaScript/XSS KHÔNG THỂ chạm vào)
  res.cookie('secure_jwt', token, {
    httpOnly: true,
    secure: false, // Để false cho local dev demo HTTP
    sameSite: 'strict',
    path: '/'
  });

  return res.json({
    success: true,
    message: 'Đăng nhập thành công! Server đã cấp 2 Cookie: [insecure_token] (Lộ XSS) và [secure_jwt] (An toàn tuyệt đối)',
    user: { id: user.id, username: user.username, balance: user.balance, role: user.role },
    csrfToken: csrfToken
  });
});

/**
 * 2. PHÒNG THỦ CSRF: Chuyển tiền (So sánh Không kiểm tra vs Có kiểm tra SameSite/CSRF Token)
 */
app.post('/api/transfer', (req, res) => {
  const { toAccount, amount, csrfToken, defenseMode = 'secure' } = req.body;

  // Lấy danh tính người gửi từ cookie
  const token = req.cookies.secure_jwt || req.cookies.insecure_token;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập! Không tìm thấy cookie phiên.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }

  const sender = DB_USERS.find(u => u.id === decoded.id);
  if (!sender) return res.status(404).json({ success: false, error: 'Không tìm thấy người gửi' });

  // NẾU CHỌN CHẾ ĐỘ AN TOÀN (Phòng thủ CSRF qua Token)
  if (defenseMode === 'secure') {
    const validCsrf = CSRF_TOKENS.get(sender.id);
    const clientCsrf = req.headers['x-csrf-token'] || csrfToken;

    if (!clientCsrf || clientCsrf !== validCsrf) {
      return res.status(403).json({
        success: false,
        error: 'CSRF ATTACK DETECTED & BLOCKED! Request bị chặn do thiếu hoặc sai Anti-CSRF Token.'
      });
    }
  }

  // Thực hiện trừ tiền
  const transferAmount = Number(amount) || 0;
  if (sender.balance < transferAmount) {
    return res.status(400).json({ success: false, error: 'Số dư không đủ' });
  }

  sender.balance -= transferAmount;

  return res.json({
    success: true,
    message: `Chuyển thành công $${transferAmount} tới tài khoản ${toAccount}!`,
    currentBalance: sender.balance,
    defenseApplied: defenseMode === 'secure' ? 'Anti-CSRF Token Verified' : 'Vulnerable (No CSRF Token Check)'
  });
});

/**
 * 3. PHÒNG THỦ SQL / NoSQL INJECTION: Tìm kiếm User
 */
app.post('/api/users/search', (req, res) => {
  const { mode = 'vulnerable', payload } = req.body;

  if (mode === 'vulnerable') {
    // ❌ LỖI VULNERABLE: Giả lập SQL Injection bằng phép cộng chuỗi
    // Nếu payload gửi lên là: admin' OR '1'='1
    const mockSqlString = `SELECT * FROM users WHERE username = '${payload}'`;

    if (String(payload).includes("' OR '1'='1") || String(payload).includes("' OR 1=1")) {
      return res.json({
        success: true,
        mode: 'Vulnerable String Concat',
        executedSql: mockSqlString,
        warning: 'SQL INJECTION SUCCESSFUL! Bị vượt qua kiểm tra, hacker xem được toàn bộ danh sách users!',
        data: DB_USERS
      });
    }

    const found = DB_USERS.filter(u => u.username === payload);
    return res.json({ success: true, mode: 'Vulnerable String Concat', executedSql: mockSqlString, data: found });
  }

  // ✅ CHẾ ĐỘ AN TOÀN: Dùng Zod Schema Validate Type & Parameterized Query Simulation
  const InputSchema = z.object({
    username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Tên chỉ được chứa chữ cái, số và dấu gạch dưới (Chống Injection ký tự lạ)')
  });

  const parsed = InputSchema.safeParse({ username: payload });
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      mode: 'Secure Parameterized & Strict Type Validation',
      error: 'INPUT VALIDATION REJECTED: Phát hiện ký tự bất thường hoặc sai kiểu dữ liệu!',
      details: parsed.error.issues.map(i => i.message)
    });
  }

  // Parameterized Query an toàn: Database driver coi param là literal value $1
  const sanitizedUsername = parsed.data.username;
  const mockPreparedSql = `SELECT * FROM users WHERE username = $1 [Param 1 = "${sanitizedUsername}"]`;
  const found = DB_USERS.filter(u => u.username === sanitizedUsername);

  return res.json({
    success: true,
    mode: 'Secure Parameterized & Validated',
    executedSql: mockPreparedSql,
    data: found
  });
});

/**
 * 4. PHÒNG THỦ IDOR (Insecure Direct Object Reference)
 * Lấy chi tiết đơn hàng
 */
app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const { mode = 'secure' } = req.query;

  // Lấy User hiện tại từ JWT cookie (Mặc định Alice đang login)
  const token = req.cookies.secure_jwt || req.cookies.insecure_token;
  let currentUserId = 'usr_alice'; // Fallback nếu chưa login

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.id;
    } catch (e) {}
  }

  if (mode === 'vulnerable') {
    // ❌ SAI LẦM IDOR: Chỉ tìm theo ID truyền lên, không quan tâm ai là chủ sở hữu
    const order = DB_ORDERS.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' });

    return res.json({
      success: true,
      mode: 'Vulnerable IDOR',
      warning: order.userId !== currentUserId ? `IDOR EXPLOIT! Bạn là ${currentUserId} nhưng vừa đọc trộm được đơn hàng của ${order.userId}!` : undefined,
      order: order
    });
  }

  // ✅ CHUẨN XÁC: Luôn ràng buộc quyền sở hữu (Where id = orderId AND userId = currentUserId)
  const order = DB_ORDERS.find(o => o.id === orderId && o.userId === currentUserId);
  if (!order) {
    return res.status(404).json({
      success: false,
      mode: 'Secure Ownership Check',
      error: '404 Not Found: Đơn hàng không tồn tại hoặc bạn không có quyền truy cập đơn hàng này!'
    });
  }

  return res.json({
    success: true,
    mode: 'Secure Ownership Check',
    order: order
  });
});

/**
 * 5. PHÒNG THỦ SSRF (Server-Side Request Forgery)
 * API tải trước metadata từ một URL do người dùng cung cấp
 */
app.post('/api/ssrf/fetch-preview', async (req, res) => {
  const { url, mode = 'secure' } = req.body;

  if (!url) return res.status(400).json({ success: false, error: 'Thiếu tham số URL' });

  if (mode === 'vulnerable') {
    // ❌ VULNERABLE: Cho phép fetch bất kỳ địa chỉ nào
    // Nếu hacker truyền: http://169.254.169.254 hoặc http://127.0.0.1
    if (url.includes('169.254.169.254')) {
      return res.json({
        success: true,
        mode: 'Vulnerable SSRF',
        warning: 'CRITICAL SSRF EXPLOITED: Đã đánh cắp thông tin AWS Cloud Metadata!',
        mockMetadataResponse: {
          iamRole: 'arn:aws:iam::123456789012:role/ProductionBackendRole',
          AccessKeyId: 'ASIAIOSFODNN7EXAMPLE',
          SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          Token: 'AQoDYXdzEJr1...mockSessionToken...'
        }
      });
    }

    if (url.includes('127.0.0.1') || url.includes('localhost')) {
      return res.json({
        success: true,
        mode: 'Vulnerable SSRF',
        warning: 'SSRF EXPLOITED: Đã quét trúng dịch vụ nội bộ (Internal Loopback)!',
        internalService: 'Redis Cache Server v7.2 - Authenticated: false'
      });
    }

    return res.json({
      success: true,
      mode: 'Vulnerable SSRF',
      message: `Đã kết nối thành công tới ${url}`
    });
  }

  // ✅ CHẾ ĐỘ AN TOÀN: Validate Scheme & Chặn dải Private IP / Metadata
  try {
    const parsed = new URL(url);

    // 1. Chỉ chấp nhận HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        mode: 'Secure SSRF Filter',
        error: `SSRF BLOCKED: Giao thức [${parsed.protocol}] bị cấm! Chỉ chấp nhận http hoặc https.`
      });
    }

    // 2. Chặn Private IP & Metadata Service
    const hostname = parsed.hostname.toLowerCase();
    const isPrivate = 
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      (hostname.startsWith('172.') && Number(hostname.split('.')[1]) >= 16 && Number(hostname.split('.')[1]) <= 31);

    if (isPrivate) {
      return res.status(403).json({
        success: false,
        mode: 'Secure SSRF Filter',
        error: `SSRF DEFENSE TRIGGERED: Hostname [${hostname}] thuộc dải mạng nội bộ hoặc Cloud Metadata bí mật! Yêu cầu bị hủy ngay lập tức.`
      });
    }

    return res.json({
      success: true,
      mode: 'Secure SSRF Filter',
      message: `URL an toàn: ${url}. Đã vượt qua tường lửa kiểm tra IP nội bộ.`
    });
  } catch (e) {
    return res.status(400).json({ success: false, error: 'URL không hợp lệ: ' + e.message });
  }
});

/**
 * 6. RATE LIMITING: Test endpoint với bộ giới hạn 5 req / phút
 */
app.post('/api/rate-limit/test', authLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Request hợp lệ! Tần suất của bạn vẫn nằm trong ngưỡng cho phép (tối đa 5 lần/phút).',
    timestamp: new Date().toLocaleTimeString()
  });
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  BACKEND SECURITY LAB SERVICE RUNNING ON PORT ${PORT}`);
  console.log(`📡 Endpoints: /api/auth/login, /api/transfer, /api/users/search`);
  console.log(`              /api/orders/:id, /api/ssrf/fetch-preview, /api/rate-limit/test`);
  console.log(`=======================================================`);
});
