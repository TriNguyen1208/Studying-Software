const express = require('express');
const router = express.Router();

const {
  getProductWithCacheAside,
  getProductWithMutexLock,
  invalidateProductCache,
  clearAllProductCache,
  getStats,
} = require('../services/cacheService');

const {
  simulatePurchaseWithoutLock,
  simulatePurchaseWithDistributedLock,
  getDatabaseStock,
  resetDatabaseStock,
} = require('../services/lockService');

const {
  checkRateLimit,
  resetRateLimit,
} = require('../services/rateLimiterService');

const {
  getTopLeaderboard,
  incrementScore,
  addOrUpdatePlayer,
  resetLeaderboard,
} = require('../services/leaderboardService');

const {
  publishMessage,
  registerSSEClient,
} = require('../services/pubsubService');

const {
  getRedisInfo,
} = require('../services/inspectorService');

// ==================== 1. CACHE ROUTES ====================

router.get('/cache/product/:id', async (req, res, next) => {
  try {
    const result = await getProductWithCacheAside(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/cache/product/:id/mutex', async (req, res, next) => {
  try {
    const result = await getProductWithMutexLock(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/cache/product/:id', async (req, res, next) => {
  try {
    const result = await invalidateProductCache(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/cache/clear', async (req, res, next) => {
  try {
    const result = await clearAllProductCache();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/cache/stats', (req, res) => {
  res.json(getStats());
});

// ==================== 2. DISTRIBUTED LOCK & FLASH SALE ROUTES ====================

router.post('/lock/purchase/unsafe', async (req, res, next) => {
  try {
    const buyerId = req.body.buyerId || `User_${Math.floor(Math.random() * 1000)}`;
    const result = await simulatePurchaseWithoutLock(buyerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/lock/purchase/safe', async (req, res, next) => {
  try {
    const buyerId = req.body.buyerId || `User_${Math.floor(Math.random() * 1000)}`;
    const result = await simulatePurchaseWithDistributedLock(buyerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/lock/stock', (req, res) => {
  const stock = getDatabaseStock('prod_flash_sale');
  res.json({ productId: 'prod_flash_sale', stock });
});

router.post('/lock/stock/reset', (req, res) => {
  const newStock = parseInt(req.body.stock || '5', 10);
  const updated = resetDatabaseStock('prod_flash_sale', newStock);
  res.json({ success: true, stock: updated });
});

// ==================== 3. RATE LIMITER ROUTES ====================

router.get('/ratelimit/check', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const limit = parseInt(req.query.limit || '10', 10);
    const windowMs = parseInt(req.query.windowMs || '10000', 10);
    const result = await checkRateLimit(ip, limit, windowMs);

    if (!result.allowed) {
      return res.status(429).json({
        ...result,
        error: 'Too Many Requests',
        message: 'Bạn đã vượt quá giới hạn gửi request! Vui lòng chờ cooldown.',
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/ratelimit/reset', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const result = await resetRateLimit(ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==================== 4. LEADERBOARD ROUTES ====================

router.get('/leaderboard', async (req, res, next) => {
  try {
    const top = parseInt(req.query.top || '10', 10);
    const result = await getTopLeaderboard(top);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/leaderboard/score', async (req, res, next) => {
  try {
    const { playerName, delta } = req.body;
    if (!playerName) {
      return res.status(400).json({ error: 'Thiếu tên người chơi (playerName)' });
    }
    const result = await incrementScore(playerName, parseFloat(delta || 100));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/leaderboard/reset', async (req, res, next) => {
  try {
    const result = await resetLeaderboard();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==================== 5. PUB/SUB & SSE ROUTES ====================

router.post('/pubsub/publish', async (req, res, next) => {
  try {
    const { topic, content, sender } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Thiếu nội dung tin nhắn' });
    }
    const result = await publishMessage(topic || 'ANNOUNCEMENT', content, sender || 'Giảng viên');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/pubsub/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  registerSSEClient(res);
});

// ==================== 6. INSPECTOR ROUTES ====================

router.get('/inspector/metrics', async (req, res, next) => {
  try {
    const metrics = await getRedisInfo();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
