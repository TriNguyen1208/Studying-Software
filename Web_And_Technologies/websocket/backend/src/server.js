/**
 * ==============================================================================
 * PRODUCTION-GRADE WEBSOCKET BACKEND SERVICE (RFC 6455)
 * ==============================================================================
 * Kiến trúc máy chủ WebSocket thời gian thực hỗ trợ:
 * 1. Cơ chế Bắt tay HTTP Upgrade (RFC 6455 Handshake)
 * 2. Phân tán qua Redis Pub/Sub Adapter (Horizontal Scaling)
 * 3. Phát hiện và dọn dẹp kết nối ma bằng Heartbeat Ping/Pong
 * 4. Quản lý phòng (Room Isolation) và chia sẻ thông điệp
 * 5. Giám sát áp lực ngược (Backpressure check qua bufferedAmount)
 * 6. Graceful Shutdown an toàn khi server dừng.
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const SERVER_INSTANCE_ID = process.env.SERVER_INSTANCE_ID || `ws-node-${process.pid}`;

app.use(cors());
app.use(express.json());

// HTTP Server
const server = http.createServer(app);

// Khởi tạo WebSocketServer gắn cùng HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

// ------------------------------------------------------------------------------
// QUẢN LÝ BỘ NHỚ KẾT NỐI & PHÒNG (ROOMS STATE)
// ------------------------------------------------------------------------------
// Map lưu trữ: socketId -> WebSocket instance
const clientsMap = new Map();
// Map lưu trữ: roomId -> Set các socketId đang tham gia
const roomsMap = new Map();

// ------------------------------------------------------------------------------
// CẤU HÌNH REDIS PUB/SUB ADAPTER (HORIZONTAL SCALING)
// ------------------------------------------------------------------------------
/**
 * TẠI SAO CẦN REDIS PUB/SUB TRONG PRODUCTION?
 * - Khi triển khai nhiều instance WebSocket server phía sau Load Balancer,
 *   User A kết nối tới Node 1, User B kết nối tới Node 2.
 * - Nếu không có Redis làm trung gian phân phối, User A nhắn tin thì Node 1 không thể
 *   chuyển tiếp tới socket của User B trên Node 2.
 */
let redisPublisher = null;
let redisSubscriber = null;

try {
  redisPublisher = new Redis({ host: REDIS_HOST, port: REDIS_PORT, retryStrategy: () => 3000, lazyConnect: true });
  redisSubscriber = new Redis({ host: REDIS_HOST, port: REDIS_PORT, retryStrategy: () => 3000, lazyConnect: true });

  redisPublisher.connect().then(() => {
    console.log(`✅ [${SERVER_INSTANCE_ID}] Connected to Redis Publisher`);
  }).catch(() => {
    console.warn(`⚠️ [${SERVER_INSTANCE_ID}] Redis not available, running in single-node mode`);
  });

  redisSubscriber.connect().then(() => {
    console.log(`✅ [${SERVER_INSTANCE_ID}] Connected to Redis Subscriber`);
    // Lắng nghe kênh phân phối chat toàn cầu
    redisSubscriber.subscribe('global:ws:broadcast', (err) => {
      if (!err) console.log(`📡 [${SERVER_INSTANCE_ID}] Subscribed to Redis channel: global:ws:broadcast`);
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'global:ws:broadcast') {
        try {
          const payload = JSON.parse(message);
          // Tránh broadcast lại nếu chính node này vừa publish
          if (payload.originServer !== SERVER_INSTANCE_ID) {
            broadcastLocalRoom(payload.room, payload.data, null);
          }
        } catch (e) {
          console.error('Failed to parse Redis message:', e);
        }
      }
    });
  }).catch(() => {
    console.warn(`⚠️ [${SERVER_INSTANCE_ID}] Redis subscriber disabled`);
  });
} catch (e) {
  console.warn('Redis init skipped:', e.message);
}

// ------------------------------------------------------------------------------
// HÀM TIỆN ÍCH QUẢN LÝ PHÒNG & BROADCAST
// ------------------------------------------------------------------------------

/**
 * Broadcast tin nhắn tới các client nội bộ cùng phòng trên Node này
 */
function broadcastLocalRoom(roomId, messageObj, senderWs = null) {
  const roomSockets = roomsMap.get(roomId);
  if (!roomSockets) return;

  const payloadString = JSON.stringify(messageObj);

  roomSockets.forEach(socketId => {
    const targetWs = clientsMap.get(socketId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      // Không gửi lại cho chính người gửi nếu có yêu cầu
      if (senderWs && targetWs === senderWs) return;

      /**
       * KIỂM TRA ÁP LỰC NGƯỢC (BACKPRESSURE CHECK)
       * Đoạn này làm gì?
       * - Kiểm tra `targetWs.bufferedAmount` xem bộ đệm RAM của socket này có bị ứ đọng không.
       * Tại sao cần trong production?
       * - Nếu 1 client mạng chậm (Slow Consumer), dữ liệu chưa kịp gửi sẽ phình to trong RAM.
       * - Nếu vượt 1MB, ta cảnh báo hoặc drop frame để bảo vệ server khỏi lỗi Out of Memory.
       */
      if (targetWs.bufferedAmount > 1024 * 1024) {
        console.warn(`⚠️ [Backpressure] Client ${socketId} mạng quá chậm (Buffer: ${targetWs.bufferedAmount} bytes).`);
        return;
      }

      targetWs.send(payloadString);
    }
  });
}

/**
 * Phát tán tin nhắn tới toàn bộ cụm Cluster (kết hợp Redis Pub/Sub)
 */
function publishMessage(roomId, data, senderWs) {
  // 1. Gửi ngay cho các client đang kết nối trên node này
  broadcastLocalRoom(roomId, data, senderWs);

  // 2. Publish vào Redis để các node khác nhận được và gửi cho client của họ
  if (redisPublisher && redisPublisher.status === 'ready') {
    redisPublisher.publish('global:ws:broadcast', JSON.stringify({
      originServer: SERVER_INSTANCE_ID,
      room: roomId,
      data: data
    })).catch(err => console.error('Redis publish failed:', err));
  }
}

// ------------------------------------------------------------------------------
// WEBSOCKET CONNECTION LIFECYCLE
// ------------------------------------------------------------------------------
wss.on('connection', (ws, req) => {
  const socketId = uuidv4();
  ws.id = socketId;
  ws.isAlive = true;
  ws.currentRoom = 'general'; // Phòng mặc định

  clientsMap.set(socketId, ws);

  // Thêm vào phòng mặc định
  if (!roomsMap.has('general')) roomsMap.set('general', new Set());
  roomsMap.get('general').add(socketId);

  console.log(`🔌 [Connected] Socket ${socketId} connected to node ${SERVER_INSTANCE_ID}. Room: general`);

  // Phản hồi chào mừng và cấp ID cho client
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    socketId: socketId,
    serverNode: SERVER_INSTANCE_ID,
    room: 'general',
    timestamp: Date.now()
  }));

  // Nhận thông điệp từ Client
  ws.on('message', (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());

      switch (parsed.type) {
        // Tham gia chuyển phòng
        case 'JOIN_ROOM': {
          const oldRoom = ws.currentRoom;
          const newRoom = parsed.room || 'general';

          // Rời phòng cũ
          if (roomsMap.has(oldRoom)) {
            roomsMap.get(oldRoom).delete(socketId);
          }

          // Vào phòng mới
          if (!roomsMap.has(newRoom)) roomsMap.set(newRoom, new Set());
          roomsMap.get(newRoom).add(socketId);
          ws.currentRoom = newRoom;

          console.log(`🔄 Socket ${socketId} moved from #${oldRoom} to #${newRoom}`);
          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            room: newRoom,
            timestamp: Date.now()
          }));
          break;
        }

        // Gửi tin nhắn chat
        case 'CHAT_MESSAGE': {
          const chatPayload = {
            type: 'NEW_MESSAGE',
            id: uuidv4(),
            senderId: socketId,
            senderName: parsed.senderName || 'Anonymous',
            text: parsed.text,
            room: ws.currentRoom,
            serverNode: SERVER_INSTANCE_ID,
            timestamp: Date.now()
          };

          // Phát tán tin nhắn tới mọi người trong phòng
          publishMessage(ws.currentRoom, chatPayload, null);
          break;
        }

        // Trả lời Pong của Heartbeat
        case 'PONG': {
          ws.isAlive = true;
          break;
        }

        default:
          console.warn(`Unknown message type: ${parsed.type}`);
      }
    } catch (err) {
      console.error(`Malformed frame received from ${socketId}:`, err);
    }
  });

  // Client chủ động phản hồi pong frame ở tầng protocol
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Khi kết nối bị đóng
  ws.on('close', (code, reason) => {
    console.log(`🚪 [Disconnected] Socket ${socketId} closed. Code: ${code}`);
    cleanupSocket(socketId, ws.currentRoom);
  });

  ws.on('error', (err) => {
    console.error(`❌ [Socket Error] ${socketId}:`, err.message);
    cleanupSocket(socketId, ws.currentRoom);
  });
});

function cleanupSocket(socketId, room) {
  clientsMap.delete(socketId);
  if (roomsMap.has(room)) {
    roomsMap.get(room).delete(socketId);
    if (roomsMap.get(room).size === 0) roomsMap.delete(room);
  }
}

// ------------------------------------------------------------------------------
// CƠ CHẾ HEARTBEAT (GHOST CONNECTION DETECTOR & CLEANUP)
// ------------------------------------------------------------------------------
/**
 * TẠI SAO BẮT BUỘC PHẢI CÓ TRONG PRODUCTION?
 * - Nếu người dùng mất sóng 4G, sập nguồn máy tính đột ngột, không có gói tin TCP FIN nào gửi tới.
 * - Node.js sẽ giữ socket đó mãi mãi trong RAM.
 * - Heartbeat Ping định kỳ: Nếu không thấy client phản hồi Pong, coi như kết nối đã chết và cưỡng chế đóng.
 */
const HEARTBEAT_INTERVAL_MS = 15000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.warn(`💀 [Ghost Connection] Socket ${ws.id} không phản hồi Pong. Đang dọn dẹp...`);
      cleanupSocket(ws.id, ws.currentRoom);
      return ws.terminate();
    }

    // Đặt lại cờ là false và gửi Ping
    ws.isAlive = false;
    ws.ping(); // Gửi Ping Frame (Opcode 0x9) chuẩn RFC 6455
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

// ------------------------------------------------------------------------------
// REST MONITORING APIS & HEALTHCHECK
// ------------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    serverNode: SERVER_INSTANCE_ID,
    activeConnections: clientsMap.size,
    totalRooms: roomsMap.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/stats', (req, res) => {
  const roomStats = {};
  roomsMap.forEach((sockets, room) => {
    roomStats[room] = sockets.size;
  });

  res.status(200).json({
    serverNode: SERVER_INSTANCE_ID,
    activeSockets: clientsMap.size,
    rooms: roomStats,
    memoryRssMb: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
    redisConnected: redisPublisher?.status === 'ready'
  });
});

// ------------------------------------------------------------------------------
// GRACEFUL SHUTDOWN
// ------------------------------------------------------------------------------
const shutdown = () => {
  console.log(`⚠️ [${SERVER_INSTANCE_ID}] Received shutdown signal. Closing all WebSockets gracefully...`);
  clearInterval(heartbeatTimer);

  wss.clients.forEach(ws => {
    ws.close(1001, 'Server is going down for maintenance');
  });

  server.close(() => {
    console.log(`✅ [${SERVER_INSTANCE_ID}] HTTP and WebSocket servers closed.`);
    if (redisPublisher) redisPublisher.disconnect();
    if (redisSubscriber) redisSubscriber.disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [${SERVER_INSTANCE_ID}] WebSocket Server listening on http://0.0.0.0:${PORT}/ws`);
});
