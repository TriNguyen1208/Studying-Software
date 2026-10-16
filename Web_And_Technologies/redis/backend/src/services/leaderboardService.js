const { redis } = require('../config/redis');

const LEADERBOARD_KEY = 'leaderboard:global';

/**
 * REDIS REAL-TIME LEADERBOARD SERVICE (SORTED SET - ZSET)
 * 
 * Tại sao RDBMS (PostgreSQL/MySQL) thất bại ở bài toán Leaderboard triệu người dùng?
 * - Trong RDBMS: Khi 1 triệu người chơi liên tục tăng điểm, câu lệnh:
 *   `SELECT user_id, score, RANK() OVER (ORDER BY score DESC) FROM leaderboard`
 *   yêu cầu sắp xếp lại (Sort/B-Tree rebalance) liên tục -> Gây Disk I/O spike và lock table.
 * - Trong Redis: Sorted Set kết hợp giữa **SkipList** (Bảng nhảy phân tầng) và **Dict** (Hash table):
 *   + Cập nhật điểm (`ZINCRBY`): Độ phức tạp $O(\log N)$.
 *   + Lấy Top 10 cao nhất (`ZREVRANGE`): Độ phức tạp $O(\log N + M)$ với M là số phần tử lấy ra.
 *   + Tra cứu thứ hạng tức thì (`ZREVRANK`): Độ phức tạp $O(\log N)$.
 *   Tất cả diễn ra hoàn toàn trên RAM!
 */

/**
 * Khởi tạo dữ liệu mẫu nếu bảng xếp hạng chưa có
 */
async function initializeLeaderboard() {
  const count = await redis.zcard(LEADERBOARD_KEY);
  if (count === 0) {
    const initialPlayers = [
      { name: 'Nguyễn Văn A (ProGamer)', score: 9850 },
      { name: 'Trần Thị B (CyberNinja)', score: 8720 },
      { name: 'Lê Hoàng C (ShadowKnight)', score: 8100 },
      { name: 'Phạm Đức D (CodeWarrior)', score: 7650 },
      { name: 'Vũ Minh E (SpeedDemon)', score: 6900 },
      { name: 'Đỗ Hải F (IronClad)', score: 5400 },
      { name: 'Bùi Tuấn G (BlazeRider)', score: 4800 },
    ];

    const pipeline = redis.pipeline();
    for (const player of initialPlayers) {
      pipeline.zadd(LEADERBOARD_KEY, player.score, player.name);
    }
    await pipeline.exec();
    console.log('[Leaderboard] Đã khởi tạo bảng xếp hạng mẫu thành công.');
  }
}

/**
 * Lấy danh sách Top N người chơi dẫn đầu
 */
async function getTopLeaderboard(top = 10) {
  // Lấy danh sách từ điểm cao nhất đến thấp nhất kèm theo điểm số
  // ZREVRANGE leaderboard:global 0 (top - 1) WITHSCORES
  const rawResults = await redis.zrevrange(LEADERBOARD_KEY, 0, top - 1, 'WITHSCORES');
  
  const leaderboard = [];
  for (let i = 0; i < rawResults.length; i += 2) {
    leaderboard.push({
      rank: Math.floor(i / 2) + 1,
      playerName: rawResults[i],
      score: parseFloat(rawResults[i + 1]),
    });
  }

  const totalPlayers = await redis.zcard(LEADERBOARD_KEY);
  return {
    totalPlayers,
    leaderboard,
  };
}

/**
 * Tăng điểm số người chơi theo thời gian thực (ZINCRBY)
 */
async function incrementScore(playerName, pointsDelta) {
  // ZINCRBY key increment member (O(log N))
  const newScore = await redis.zincrby(LEADERBOARD_KEY, pointsDelta, playerName);
  // ZREVRANK key member (Lấy thứ hạng hiện tại 0-indexed)
  const rank = await redis.zrevrank(LEADERBOARD_KEY, playerName);

  return {
    playerName,
    pointsDelta,
    newScore: parseFloat(newScore),
    currentRank: rank !== null ? rank + 1 : null,
  };
}

/**
 * Thêm một người chơi mới vào Leaderboard
 */
async function addOrUpdatePlayer(playerName, score) {
  await redis.zadd(LEADERBOARD_KEY, score, playerName);
  const rank = await redis.zrevrank(LEADERBOARD_KEY, playerName);
  return {
    playerName,
    score,
    currentRank: rank !== null ? rank + 1 : null,
  };
}

/**
 * Reset bảng xếp hạng
 */
async function resetLeaderboard() {
  await redis.del(LEADERBOARD_KEY);
  await initializeLeaderboard();
  return { success: true };
}

module.exports = {
  initializeLeaderboard,
  getTopLeaderboard,
  incrementScore,
  addOrUpdatePlayer,
  resetLeaderboard,
};
