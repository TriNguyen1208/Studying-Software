const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let comments = [
  { id: 1, author: "Alice", text: "Giao diện mới trông thật tuyệt vời! ✨", createdAt: new Date().toISOString() },
  { id: 2, author: "Bob", text: "JAMstack kết hợp với Next.js SSG thật sự rất nhanh.", createdAt: new Date().toISOString() },
  { id: 3, author: "Charlie", text: "Mình rất thích các micro-animations!", createdAt: new Date().toISOString() }
];

app.get('/api/comments', (req, res) => {
  setTimeout(() => {
    res.json(comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, 300);
});

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

  setTimeout(() => {
    res.status(201).json(newComment);
  }, 300);
});

app.listen(port, () => {
  console.log(`🚀 Independent Backend API Server running at http://localhost:${port}`);
});
