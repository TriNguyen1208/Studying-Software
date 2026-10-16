const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json()); // Để parse JSON body cho POST request

// Giả lập một Database (In-memory)
let comments = [
  { id: 1, author: "Alice", text: "Wow, JAMstack quá tuyệt vời!", createdAt: new Date().toISOString() },
  { id: 2, author: "Bob", text: "Đúng vậy, tốc độ load siêu nhanh vì HTML đã sinh sẵn.", createdAt: new Date().toISOString() },
  { id: 3, author: "Charlie", text: "Và phần bình luận này đang được tải thông qua API nè.", createdAt: new Date().toISOString() }
];

// Định nghĩa API GET: Trả về dữ liệu động
app.get('/api/comments', (req, res) => {
  // Giả lập delay mạng 500ms để thấy rõ quá trình fetching
  setTimeout(() => {
    // Sắp xếp comment mới nhất lên đầu
    res.json(comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, 500);
});

// Định nghĩa API POST: Thêm bình luận mới
app.post('/api/comments', (req, res) => {
  const { author, text } = req.body;
  
  if (!author || !text) {
    return res.status(400).json({ error: "Tên và nội dung không được để trống!" });
  }

  const newComment = {
    id: comments.length + 1,
    author,
    text,
    createdAt: new Date().toISOString()
  };

  comments.push(newComment);

  // Phản hồi về client sau 500ms
  setTimeout(() => {
    res.status(201).json(newComment);
  }, 500);
});

app.listen(port, () => {
  console.log(`🚀 API Server đang chạy tại http://localhost:${port}`);
});
