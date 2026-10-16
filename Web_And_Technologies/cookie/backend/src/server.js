/**
 * ==============================================================================
 * PRODUCTION-GRADE HTTP COOKIE SECURITY BACKEND SERVICE
 * ==============================================================================
 * Dịch vụ minh chứng các kỹ thuật bảo mật Cookie:
 * 1. Thuộc tính HttpOnly (Lá chắn phòng chống XSS)
 * 2. Thuộc tính SameSite (Lá chắn phòng chống CSRF)
 * 3. Chữ ký số HMAC-SHA256 (Signed Cookies - Phòng chống gian lận)
 * 4. Xóa cookie chuẩn mực (Tránh lỗi tồn dư do sai lệch Domain/Path).
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// KHÓA BÍ MẬT DÙNG ĐỂ KÝ COOKIE (HMAC SECRET KEY)
// Trong production, chuỗi này phải được đọc từ biến môi trường bí mật (Vault / Secret Manager)
const COOKIE_SIGNING_SECRET = process.env.COOKIE_SECRET || 'super_secure_production_hmac_secret_key_98765';

app.use(cors({
  origin: true, // Cho phép phản hồi đúng origin để trình duyệt nhận Set-Cookie
  credentials: true // BẮT BUỘC: Cho phép gửi và nhận cookie qua giao thức CORS
}));
app.use(express.json());
// Nạp cookie-parser với khóa bí mật để kích hoạt Signed Cookies
app.use(cookieParser(COOKIE_SIGNING_SECRET));

// ------------------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------------------

/**
 * 1. ĐĂNG NHẬP & THIẾT LẬP CÁC LOẠI COOKIE
 * Đoạn này làm gì?
 * - Cấp phát 2 loại cookie cho client:
 *   + `client_pref`: Cookie công khai (không có HttpOnly), Client JS có thể đọc được (như theme, lang).
 *   + `secure_session`: Cookie bí mật (CÓ HttpOnly, CÓ Signed HMAC), Client JS cấm đọc.
 */
app.post('/api/cookies/login', (req, res) => {
  const { username = 'alice_demo', role = 'user' } = req.body;
  const sessionPayload = JSON.stringify({ username, role, loginAt: Date.now() });

  // 1. Set Public Cookie (Client JS đọc được qua document.cookie)
  res.cookie('client_theme', 'dark_cyberpunk', {
    maxAge: 7 * 24 * 3600 * 1000,
    sameSite: 'lax',
    path: '/'
  });

  // 2. Set Secure Signed Cookie (Bảo mật tuyệt đối, chống XSS & chống giả mạo)
  res.cookie('secure_session', sessionPayload, {
    httpOnly: true,             // Ngăn chặn mã độc JS đọc trộm
    signed: true,               // Ký số HMAC-SHA256 chống người dùng sửa giá trị
    sameSite: 'lax',            // Chống tấn công CSRF
    maxAge: 2 * 3600 * 1000,    // Sống trong 2 giờ
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công! Đã thiết lập 1 Public Cookie và 1 Signed HttpOnly Cookie.',
    user: { username, role },
    explanation: {
      clientTheme: 'Không có HttpOnly => JavaScript có thể đọc được.',
      secureSession: 'CÓ HttpOnly + CÓ HMAC Signed => Hoàn toàn vô hình trước JavaScript và miễn nhiễm với giả mạo.'
    }
  });
});

/**
 * 2. KIỂM DUYỆT COOKIE TỪ REQUEST (INSPECT & VERIFY HMAC)
 * Đoạn này làm gì?
 * - Phân tích các cookie mà trình duyệt đã tự động gửi kèm trong request header.
 * - `req.cookies`: Chứa các cookie thông thường không có chữ ký.
 * - `req.signedCookies`: Chứa các cookie ĐÃ XÁC THỰC CHỮ KÝ HMAC HỢP LỆ.
 *   Nếu người dùng tự ý sửa cookie trên trình duyệt, giá trị trong req.signedCookies sẽ là `false`!
 */
app.get('/api/cookies/inspect', (req, res) => {
  const rawCookieHeader = req.headers.cookie || 'none';
  const publicCookies = req.cookies;
  const signedCookies = req.signedCookies;

  // Kiểm tra tính toàn vẹn của secure_session
  if (signedCookies.secure_session === false) {
    return res.status(401).json({
      success: false,
      error: 'COOKIE_TAMPERING_DETECTED',
      message: '🚨 CẢNH BÁO BẢO MẬT: Giá trị cookie đã bị can thiệp trái phép trên trình duyệt! Chữ ký HMAC không khớp!',
      rawHeader: rawCookieHeader
    });
  }

  if (!signedCookies.secure_session) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHENTICATED',
      message: 'Chưa tìm thấy cookie đăng nhập hợp lệ. Vui lòng nhấn nút Đăng nhập trước.',
      publicCookies,
      rawHeader: rawCookieHeader
    });
  }

  try {
    const sessionData = JSON.parse(signedCookies.secure_session);
    res.status(200).json({
      success: true,
      message: 'Cookie hợp lệ và chữ ký số HMAC hoàn toàn chính xác!',
      session: sessionData,
      publicCookies,
      rawHeader: rawCookieHeader
    });
  } catch (err) {
    res.status(500).json({ error: 'Malformed session data' });
  }
});

/**
 * 3. XÓA COOKIE CHUẨN MỰC
 * Đoạn này làm gì?
 * - Hủy bỏ phiên đăng nhập bằng cách gửi Set-Cookie với Max-Age=0.
 * Lưu ý sống còn: Thuộc tính `path` và `domain` khi clearCookie phải trùng khớp với lúc res.cookie.
 */
app.post('/api/cookies/logout', (req, res) => {
  res.clearCookie('secure_session', { path: '/' });
  res.clearCookie('client_theme', { path: '/' });

  res.status(200).json({
    success: true,
    message: 'Đã xóa toàn bộ cookie thành công (Max-Age=0).'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Cookie Security Backend service listening on port ${PORT}`);
});
