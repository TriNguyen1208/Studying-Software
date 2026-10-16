import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMessages(query);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchMessages = async (searchQuery = '') => {
    setLoading(true);
    const startTime = performance.now();
    try {
      const url = searchQuery
        ? `http://localhost:3001/api/search?q=${encodeURIComponent(searchQuery)}`
        : 'http://localhost:3001/api/search';
      
      const response = await fetch(url);
      const data = await response.json();
      setMessages(data.results || []);
    } catch (error) {
      console.error('Lỗi khi fetch data:', error);
    } finally {
      setSearchTime(Math.round(performance.now() - startTime));
      setLoading(false);
    }
  };

  const handleEditUser = async (userId, currentName) => {
    const newName = window.prompt("Nhập tên mới cho User:", currentName);
    if (newName && newName.trim() !== "" && newName !== currentName) {
      try {
        await fetch(`http://localhost:3001/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });
        fetchMessages(query);
      } catch (err) {
        console.error('Failed to update user', err);
      }
    }
  };

  const handleEditMessage = async (msgId, currentText) => {
    const newText = window.prompt("Nhập nội dung mới cho tin nhắn:", currentText);
    if (newText && newText.trim() !== "" && newText !== currentText) {
      try {
        await fetch(`http://localhost:3001/api/messages/${msgId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newText })
        });
        fetchMessages(query);
      } catch (err) {
        console.error('Failed to update message', err);
      }
    }
  };

  return (
    <div className="container">
      <h1>Application-side Join Demo</h1>
      <p className="subtitle">Thử sửa tên của User, toàn bộ tin nhắn của User đó sẽ đổi tên tức thì!</p>
      
      <form onSubmit={(e) => { e.preventDefault(); fetchMessages(query); }} className="search-form">
        <input
          type="text"
          placeholder="Nhập từ khóa (tên user hoặc nội dung)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button">Tìm kiếm</button>
        <button 
          type="button" 
          onClick={() => { setQuery(''); fetchMessages(''); }} 
          className="clear-button"
        >
          Xóa
        </button>
      </form>

      {loading ? (
        <p className="status-text">Đang tìm kiếm...</p>
      ) : (
        <div className="messages-list">
          <p className="status-text">
            Tìm thấy <strong>{messages.length}</strong> kết quả ({searchTime}ms)
          </p>
          
          {messages.map((msg) => (
            <div key={msg.id} className="message-item">
              <div className="message-header">
                <div className="user-info-wrapper">
                  <span className="user-name">{msg.userName}</span>
                  <button className="edit-btn" onClick={() => handleEditUser(msg.userId, msg.userName)}>
                    ✏️ Sửa Tên
                  </button>
                </div>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="message-body">
                {msg.highlight?.text ? (
                  <div
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: msg.highlight.text[0] }}
                  />
                ) : (
                  <div className="message-text">{msg.text}</div>
                )}
                <button className="edit-btn" onClick={() => handleEditMessage(msg.id, msg.text)}>
                  ✏️ Sửa
                </button>
              </div>
              
              {query && msg.score && (
                <div className="relevance-score">
                  Relevance Score: {msg.score.toFixed(4)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
