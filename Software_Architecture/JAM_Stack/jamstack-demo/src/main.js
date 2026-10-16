// Đây là J (JavaScript) trong JAMstack
// Script này chạy trên trình duyệt client-side để fetch và gửi dữ liệu từ API (A)

const API_URL = 'http://localhost:3001/api/comments';

// Hàm render 1 comment HTML
const createCommentElement = (comment) => {
  const div = document.createElement('div');
  div.className = 'comment';
  const date = new Date(comment.createdAt).toLocaleString('vi-VN');
  div.innerHTML = `
    <small>${date}</small>
    <strong>${comment.author}</strong>
    <p>${comment.text}</p>
  `;
  return div;
};

// Hàm fetch danh sách comments ban đầu
const fetchComments = async () => {
  const container = document.getElementById('comments-container');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("API chưa chạy!");
    
    const comments = await response.json();
    container.innerHTML = '';
    
    if (comments.length === 0) {
      container.innerHTML = '<p class="loading">Chưa có bình luận nào.</p>';
      return;
    }

    comments.forEach(comment => {
      container.appendChild(createCommentElement(comment));
    });
  } catch (error) {
    container.innerHTML = `<div class="error-msg">⚠️ Lỗi tải bình luận: Hãy chắc chắn bạn đã chạy lệnh <code>npm run start:api</code> hoặc API đang hoạt động ở cổng 3001.</div>`;
  }
};

// Khởi chạy khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
  // 1. Tải bình luận
  fetchComments();

  // 2. Xử lý form submit
  const form = document.getElementById('comment-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Ngăn trình duyệt reload trang
    
    const author = document.getElementById('author').value.trim();
    const text = document.getElementById('text').value.trim();
    
    if (!author || !text) return;

    // Hiển thị trạng thái đang gửi
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text })
      });

      if (!response.ok) throw new Error("Gửi thất bại");

      const newComment = await response.json();
      
      // Chèn comment mới lên đầu danh sách mà ko cần reload lại API
      const container = document.getElementById('comments-container');
      container.insertBefore(createCommentElement(newComment), container.firstChild);

      // Reset form
      form.reset();
    } catch (error) {
      alert("Có lỗi xảy ra khi gửi bình luận!");
    } finally {
      // Trả lại trạng thái nút bấm
      submitBtn.disabled = false;
      submitBtn.textContent = 'Gửi bình luận';
    }
  });
});
