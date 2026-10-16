const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3006;

// Theo dõi số lần thử của từng transactionId
const attemptsMap = new Map();

app.use(cors());
app.use(express.json());

app.post('/process-payment', (req, res) => {
  const { transactionId = 'default', isInvalidRequest = false } = req.body;

  // Nếu là lỗi nghiệp vụ do Client truyền tham số sai => Lỗi vĩnh viễn 400
  if (isInvalidRequest) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Dữ liệu đầu vào không hợp lệ! Lỗi vĩnh viễn không được phép retry.'
    });
  }

  // Giả lập lỗi chập chờn: 2 lần đầu báo lỗi 503 Service Unavailable, lần 3 thành công!
  const currentAttempts = (attemptsMap.get(transactionId) || 0) + 1;
  attemptsMap.set(transactionId, currentAttempts);

  console.log(`📡 [Flaky Service] Tx: ${transactionId} - Lần gọi thứ ${currentAttempts}`);

  if (currentAttempts < 3) {
    return res.status(503).json({
      error: 'TRANSIENT_SERVICE_UNAVAILABLE',
      attempt: currentAttempts,
      message: `Hệ thống đang bận tạm thời (Lần thử ${currentAttempts}/3). Vui lòng thử lại!`
    });
  }

  // Lần 3 thành công
  attemptsMap.delete(transactionId);
  res.status(200).json({
    success: true,
    attempt: currentAttempts,
    transactionId,
    message: `Giao dịch ${transactionId} xử lý THÀNH CÔNG RỰC RỠ ở lần gọi thứ 3!`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔌 [Flaky Downstream Service] listening on port ${PORT}`);
});
