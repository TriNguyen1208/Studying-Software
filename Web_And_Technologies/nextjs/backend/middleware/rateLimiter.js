/**
 * rateLimiter.js - Giới hạn tần suất gọi API (Rate Limiting Middleware)
 * 
 * Bản chất kiến trúc:
 * - Bảo vệ backend Node.js khỏi các cuộc tấn công DDoS hoặc brute-force từ client.
 * - Sử dụng thuật toán Token Bucket / Sliding Window đơn giản trong bộ nhớ (trong production phân tán sẽ dùng Redis).
 */

const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // Khung thời gian 1 phút
const MAX_REQUESTS = 200;    // Tối đa 200 requests / phút / IP

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";
  const now = Date.now();

  const clientData = requestCounts.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  // Nếu đã qua khung thời gian 1 phút -> reset lại bộ đếm
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + WINDOW_MS;
  } else {
    clientData.count++;
  }

  requestCounts.set(ip, clientData);

  // Đính kèm các HTTP Headers chuẩn để client nhận biết trạng thái rate limit
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - clientData.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(clientData.resetTime / 1000));

  if (clientData.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Bạn đã vượt quá số lượt gọi API cho phép trong 1 phút. Vui lòng thử lại sau.",
      retryAfterSeconds: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  next();
}

module.exports = rateLimiter;
