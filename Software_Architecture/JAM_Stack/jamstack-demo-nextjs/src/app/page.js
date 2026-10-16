'use client';

import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api/comments';

export default function Home() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch API on Client
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Lỗi kết nối API');
        const data = await res.json();
        setComments(data);
      } catch (err) {
        setError('⚠️ Lỗi tải bình luận: Đảm bảo API Server đang chạy ở cổng 3001.');
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!author || !text) return;

    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text }),
      });
      if (!res.ok) throw new Error('Lỗi gửi bình luận');
      
      const newComment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setAuthor('');
      setText('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <main className="hero">
        <h1>Sức mạnh của JAMstack 🚀</h1>
        <p>
          JAMstack (Javascript, APIs, Markup) là một kiến trúc hiện đại giúp xây
          dựng các website an toàn, nhanh chóng và dễ mở rộng. Demo này sử dụng <strong>Next.js SSG</strong>.
        </p>
      </main>

      <section className="glass-panel">
        <h3>1. Markup (M - Chữ M trong JAMstack)</h3>
        <p>
          Trang web này được sinh ra thành HTML tĩnh nhờ tính năng <code>output: 'export'</code> của Next.js! Ở bước <strong>Build</strong>, máy chủ đã chuyển đổi React components thành HTML cố định.
        </p>
        <p>
          Trình duyệt tải HTML tĩnh về và hiển thị ngay lập tức, đem lại tốc độ cực nhanh, không cần Server Node.js để chạy (hoàn toàn host được trên GitHub Pages/Vercel/Netlify).
        </p>
      </section>

      <section className="glass-panel">
        <h3>2. JavaScript & APIs (J & A)</h3>
        <p>
          Phần <strong>Bình luận</strong> bên dưới sử dụng <strong>React (JavaScript)</strong> để gọi một <strong>API Backend độc lập</strong>, lấy dữ liệu động và hiển thị trên một trang HTML tĩnh.
        </p>
      </section>

      <section className="glass-panel" id="comments-section">
        <h2>Bình luận (Dynamic via API)</h2>
        
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Thêm bình luận mới</h3>
          <form onSubmit={handleSubmit} className="comment-form">
            <input 
              type="text" 
              className="input-field"
              placeholder="Tên của bạn..." 
              value={author} 
              onChange={(e) => setAuthor(e.target.value)} 
              required 
            />
            <textarea 
              rows="3" 
              className="input-field"
              placeholder="Chia sẻ suy nghĩ của bạn..." 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              required 
            />
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
            </button>
          </form>
        </div>

        <div>
          {error && <div className="error-msg">{error}</div>}
          
          {loading && !error && (
            <div className="loading-spinner">✨ Đang tải bình luận từ Server...</div>
          )}

          {!loading && !error && comments.length === 0 && (
            <p className="loading-spinner">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
          )}

          {!loading && !error && (
            <div className="comments-list">
              {comments.map((comment, index) => (
                <div key={comment.id} className="comment-card" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
