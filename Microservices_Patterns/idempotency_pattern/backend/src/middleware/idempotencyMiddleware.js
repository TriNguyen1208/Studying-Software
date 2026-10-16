const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { pool } = require('../config/database');

/**
 * Chuẩn hóa (Canonicalize) request body thành chuỗi JSON sắp xếp các key theo thứ tự bảng chữ cái.
 * Đảm bảo { a: 1, b: 2 } và { b: 2, a: 1 } sinh ra cùng một mã Hash SHA-256.
 */
function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const keyValues = sortedKeys.map(key => `"${key}":${canonicalizeJson(obj[key])}`);
  return '{' + keyValues.join(',') + '}';
}

/**
 * Tính toán Request Fingerprint (SHA-256 Hash) bao gồm:
 * HTTP Method + Đường dẫn URL + Canonical Request Body
 */
function computeRequestHash(req) {
  const canonicalBody = canonicalizeJson(req.body || {});
  const rawFingerprint = `${req.method.toUpperCase()}:${req.originalUrl || req.url}:${canonicalBody}`;
  return crypto.createHash('sha256').update(rawFingerprint).digest('hex');
}

/**
 * Production-Grade Idempotency Middleware
 * Tuân thủ IETF Draft Specification ("The Idempotency-Key HTTP Header Field")
 */
function createIdempotencyMiddleware(options = {}) {
  const lockTtlMs = options.lockTtlMs || 15000; // 15s lock duration
  const cacheTtlSec = options.cacheTtlSec || 86400; // 24h caching

  return async function idempotencyMiddleware(req, res, next) {
    // 1. Kiểm tra header Idempotency-Key
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const bypassIdempotency = req.headers['x-bypass-idempotency'] === 'true' || req.query.bypass === 'true';

    // Nếu không có header hoặc client yêu cầu bypass (để mô phỏng lỗi khi không có idempotency)
    if (!idempotencyKey || bypassIdempotency) {
      res.setHeader('X-Idempotency-Status', 'BYPASSED');
      return next();
    }

    const requestHash = computeRequestHash(req);
    const workerToken = uuidv4(); // Token đại diện cho worker xử lý request này
    const lockKey = `idemp:lock:${idempotencyKey}`;
    const cacheKey = `idemp:cache:${idempotencyKey}`;

    try {
      // 2. FAST-PATH: Kiểm tra cache trong Redis trước
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const cached = JSON.parse(cachedData);

        // Kiểm tra xem payload có bị thay đổi (Payload Tampering) không
        if (cached.requestHash !== requestHash) {
          return res.status(422).json({
            error: 'Unprocessable Entity',
            code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
            message: 'Idempotency-Key đã được sử dụng trước đó cho một yêu cầu có nội dung (payload) khác biệt.',
            providedHash: requestHash,
            expectedHash: cached.requestHash,
          });
        }

        // Tái tạo kết quả cũ (Idempotent Replay)
        res.setHeader('X-Cache-Lookup', 'HIT_REDIS');
        res.setHeader('X-Idempotent-Replay', 'true');
        res.setHeader('Idempotency-Key', idempotencyKey);
        return res.status(cached.statusCode).json(cached.body);
      }

      // 3. DURABLE-PATH: Kiểm tra trong cơ sở dữ liệu PostgreSQL
      const dbCheck = await pool.query(
        'SELECT key, request_hash, status, response_code, response_body FROM idempotency_keys WHERE key = $1',
        [idempotencyKey]
      );

      if (dbCheck.rows.length > 0) {
        const record = dbCheck.rows[0];

        // Nếu trạng thái đã hoàn tất (COMPLETED)
        if (record.status === 'COMPLETED') {
          if (record.request_hash !== requestHash) {
            return res.status(422).json({
              error: 'Unprocessable Entity',
              code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
              message: 'Idempotency-Key đã được sử dụng trước đó cho một yêu cầu có nội dung (payload) khác biệt.',
              providedHash: requestHash,
              expectedHash: record.request_hash,
            });
          }

          // Cache-aside: Nạp ngược lại vào Redis để tăng tốc các lần gọi sau
          await redis.set(
            cacheKey,
            JSON.stringify({
              statusCode: record.response_code,
              body: record.response_body,
              requestHash: record.request_hash,
            }),
            'EX',
            cacheTtlSec
          );

          res.setHeader('X-Cache-Lookup', 'HIT_POSTGRES');
          res.setHeader('X-Idempotent-Replay', 'true');
          res.setHeader('Idempotency-Key', idempotencyKey);
          return res.status(record.response_code).json(record.response_body);
        }

        // Nếu trạng thái đang thực thi (IN_PROGRESS) -> Có một request khác đang chạy đồng thời
        if (record.status === 'IN_PROGRESS') {
          return res.status(409).json({
            error: 'Conflict',
            code: 'IDEMPOTENCY_IN_PROGRESS',
            message: 'Một yêu cầu mang Idempotency-Key này đang trong quá trình xử lý (In-Flight). Vui lòng đợi và thử lại sau.',
            retryAfter: 2,
          });
        }
      }

      // 4. ATOMIC DISTRIBUTED LOCK: Giành quyền sở hữu xử lý request
      // Sử dụng lệnh nguyên tử của Redis: SET key workerToken NX PX lockTtlMs
      const lockAcquired = await redis.set(lockKey, workerToken, 'PX', lockTtlMs, 'NX');
      if (!lockAcquired) {
        // Có luồng khác vừa giành lock trong mili-giây qua
        return res.status(409).json({
          error: 'Conflict',
          code: 'CONCURRENT_REQUEST_BLOCKED',
          message: 'Phát hiện xung đột đồng thời (Race Condition). Idempotency-Key đang được khóa bởi worker khác.',
          retryAfter: 2,
        });
      }

      // 5. Đánh dấu trạng thái IN_PROGRESS vào PostgreSQL
      await pool.query(
        `INSERT INTO idempotency_keys (key, request_hash, status, locked_at)
         VALUES ($1, $2, 'IN_PROGRESS', NOW())
         ON CONFLICT (key) DO UPDATE
         SET status = 'IN_PROGRESS', request_hash = $2, locked_at = NOW()`,
        [idempotencyKey, requestHash]
      );

      // Đính kèm dữ liệu vào res.locals để ghi nhận phản hồi
      res.locals.idempotency = {
        key: idempotencyKey,
        workerToken,
        lockKey,
        cacheKey,
        requestHash,
      };

      // Ghi đè phương thức send/json để bắt được dữ liệu phản hồi (Response Interception)
      const originalJson = res.json.bind(res);
      let isFinalized = false;

      res.json = async function (body) {
        if (!isFinalized) {
          isFinalized = true;
          const statusCode = res.statusCode;

          try {
            if (statusCode < 500) {
              // Giao dịch nghiệp vụ thành công hoặc lỗi nghiệp vụ hợp lệ (200, 201, 400...)
              await pool.query(
                `UPDATE idempotency_keys
                 SET status = 'COMPLETED',
                     response_code = $1,
                     response_body = $2,
                     completed_at = NOW()
                 WHERE key = $3`,
                [statusCode, JSON.stringify(body), idempotencyKey]
              );

              // Lưu vào Redis cache
              await redis.set(
                cacheKey,
                JSON.stringify({
                  statusCode,
                  body,
                  requestHash,
                }),
                'EX',
                cacheTtlSec
              );
            } else {
              // Lỗi hệ thống cấp 5xx -> Đánh dấu FAILED để Client có thể thử lại
              await pool.query(
                `UPDATE idempotency_keys
                 SET status = 'FAILED',
                     response_code = $1,
                     response_body = $2
                 WHERE key = $3`,
                [statusCode, JSON.stringify(body), idempotencyKey]
              );
            }
          } catch (dbError) {
            console.error('[Idempotency Finalize Error]', dbError);
          } finally {
            // Giải phóng Distributed Lock bằng Lua Script an toàn
            try {
              await redis.releaseLock(lockKey, workerToken);
            } catch (unlockErr) {
              console.error('[Redis Lock Release Error]', unlockErr);
            }
          }
        }

        res.setHeader('X-Cache-Lookup', 'MISS');
        res.setHeader('X-Idempotent-Replay', 'false');
        res.setHeader('Idempotency-Key', idempotencyKey);
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('[Idempotency Middleware Error]', err);
      // Giải phóng lock khẩn cấp nếu gặp lỗi bất ngờ
      try {
        await redis.releaseLock(lockKey, workerToken);
      } catch (_) {}
      return next(err);
    }
  };
}

module.exports = {
  createIdempotencyMiddleware,
  computeRequestHash,
  canonicalizeJson,
};
