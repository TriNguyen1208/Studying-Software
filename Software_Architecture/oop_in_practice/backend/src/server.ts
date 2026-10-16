/**
 * server.ts - Điểm Khởi Động Chính Của Backend OOP
 * 
 * 💡 KIẾN TRÚC DEPENDENCY INJECTION (TIÊM PHỤ THUỘC):
 * - Thay vì các class tự khởi tạo phụ thuộc bên trong nó (hardcoded coupling):
 *   + DatabaseManager cung cấp kết nối SQLite
 *   + SqliteBankAccountRepository nhận Database
 *   + BankingService nhận Repository
 *   + BankingController nhận Service
 * - Nhờ vậy, ta có thể dễ dàng thay thế Sqlite bằng Postgres/Mongo mà KHÔNG CẦN sửa 1 dòng code nào
 *   trong BankingService hay BankAccount entity! (Nguyên lý Inversion of Control - IoC).
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { DatabaseManager } from './database/connection';
import { SqliteBankAccountRepository } from './repositories/SqliteBankAccountRepository';
import { BankingService } from './services/BankingService';
import { BankingController } from './controllers/BankingController';

const app = express();
const PORT = process.env.PORT || 5002;

// 1. Cấu hình Middleware cơ bản
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// 2. Khởi tạo hạ tầng & Dependency Injection Container
const db = DatabaseManager.getInstance();
const accountRepo = new SqliteBankAccountRepository(db);
const bankingService = new BankingService(accountRepo);
const bankingController = new BankingController(bankingService, accountRepo);

// 3. Đăng ký các Route API
app.get('/api/accounts', bankingController.getAccounts);
app.post('/api/accounts/:id/deposit', bankingController.deposit);
app.post('/api/accounts/:id/withdraw', bankingController.withdraw);
app.post('/api/accounts/transfer', bankingController.transfer);
app.post('/api/accounts/:id/pay', bankingController.payViaGateway);
app.post('/api/accounts/:id/toggle-status', bankingController.toggleStatus);
app.get('/api/database/raw', bankingController.getRawDatabase);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'OOP Banking & SQLite Backend is running',
    timestamp: new Date().toISOString()
  });
});

// 4. Khởi động HTTP Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏦 OOP Banking Backend đang chạy tại: http://localhost:${PORT}`);
  console.log(`📂 SQLite Database File: Software_Architecture/oop_in_practice/database.sqlite`);
  console.log(`🔍 Raw DB Inspector: http://localhost:${PORT}/api/database/raw`);
  console.log(`=======================================================`);
});

// 5. Graceful Shutdown: Đóng an toàn HTTP Server và Database SQLite
const gracefulShutdown = (signal: string) => {
  console.log(`\nNhận tín hiệu ${signal}. Đang đóng HTTP Server và SQLite an toàn...`);
  server.close(() => {
    DatabaseManager.close();
    console.log('Toàn bộ kết nối đã được giải phóng. Tắt tiến trình thành công.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
