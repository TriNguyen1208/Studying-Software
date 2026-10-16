const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3004;

// Trạng thái hiện tại: 'HEALTHY' | 'ERROR_500' | 'SLOW_TIMEOUT'
let currentMode = 'HEALTHY';

app.use(cors());
app.use(express.json());

// API điều khiển chế độ phục vụ
app.get('/api/mode', (req, res) => {
  res.json({ mode: currentMode });
});

app.post('/api/set-mode', (req, res) => {
  const { mode } = req.body;
  if (['HEALTHY', 'ERROR_500', 'SLOW_TIMEOUT'].includes(mode)) {
    currentMode = mode;
    console.log(`🔄 [Downstream Service] Chuyển chế độ sang: ${currentMode}`);
    return res.json({ success: true, mode: currentMode });
  }
  res.status(400).json({ error: 'Invalid mode' });
});

// API nghiệp vụ chính (Charge Payment)
app.post('/charge', (req, res) => {
  if (currentMode === 'ERROR_500') {
    return res.status(500).json({
      error: 'DOWNSTREAM_INTERNAL_ERROR',
      message: 'Cổng thanh toán đang bị quá tải và sập nguồn (500)!'
    });
  }

  if (currentMode === 'SLOW_TIMEOUT') {
    // Treo kết nối trong 5 giây (vượt quá timeout 2s của Circuit Breaker)
    return setTimeout(() => {
      res.status(200).json({ success: true, message: 'Phản hồi sau 5s chậm chạp' });
    }, 5000);
  }

  // Chế độ bình thường: Phản hồi nhanh trong 50ms
  setTimeout(() => {
    res.status(200).json({
      success: true,
      transactionId: 'TXN-' + Math.floor(Math.random() * 100000),
      message: 'Thanh toán thành công qua cổng thanh toán đối tác!'
    });
  }, 50);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔌 [Downstream Payment Service] Listening on port ${PORT}`);
});
