import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRabbitMQ, getConnection, getChannel } from './config/rabbitmq.js';
import { startOrderWorker } from './workers/orderWorker.js';
import { startDlqConsumer } from './workers/dlqConsumer.js';
import { createOrder, getStats, getLogs, streamEvents } from './controllers/orderController.js';
import { getDlqMessages, redriveMessage, redriveAll, discardMessage } from './controllers/dlqController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json());

// ============================================================================
// REST API ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Dead Letter Queue Gateway Service' });
});

// Order routes
app.post('/api/orders', createOrder);
app.get('/api/stats', getStats);
app.get('/api/logs', getLogs);
app.get('/api/events', streamEvents);

// DLQ Management routes
app.get('/api/dlq/messages', getDlqMessages);
app.post('/api/dlq/redrive-all', redriveAll);
app.post('/api/dlq/redrive/:orderId', redriveMessage);
app.delete('/api/dlq/discard/:orderId', discardMessage);

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ============================================================================
// SERVER INITIALIZATION & GRACEFUL SHUTDOWN
// ============================================================================
let server;

async function bootstrap() {
  try {
    // 1. Kết nối RabbitMQ và tạo Topology
    await connectRabbitMQ();

    // 2. Khởi động các Background Workers
    await startOrderWorker();
    await startDlqConsumer();

    // 3. Khởi chạy HTTP Server
    server = app.listen(PORT, () => {
      console.log(`================================================================`);
      console.log(`🚀 DLQ Backend Service đang chạy trên cổng http://localhost:${PORT}`);
      console.log(`📡 SSE Stream: http://localhost:${PORT}/api/events`);
      console.log(`📊 Stats API:  http://localhost:${PORT}/api/stats`);
      console.log(`================================================================`);
    });
  } catch (error) {
    console.error('❌ Khởi động server thất bại:', error);
    process.exit(1);
  }
}

// Graceful Shutdown: Đóng HTTP server, đóng channel và connection RabbitMQ an toàn
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang tiến hành Graceful Shutdown...`);
  
  if (server) {
    server.close(() => {
      console.log('🔒 HTTP Server đã đóng.');
    });
  }

  try {
    const channel = getChannel();
    if (channel) await channel.close();
    const conn = getConnection();
    if (conn) await conn.close();
    console.log('🔒 Kết nối RabbitMQ đã được đóng hoàn toàn.');
  } catch (e) {
    console.error('Lỗi khi đóng RabbitMQ:', e.message);
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

bootstrap();
