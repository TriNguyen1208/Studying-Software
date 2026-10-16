import React, { useState, useEffect } from 'react';

export default function PubSubTab({ apiUrl }) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [topic, setTopic] = useState('FLASH_SALE');
  const [content, setContent] = useState('');
  const [sender, setSender] = useState('Admin');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    // Kết nối tới Server-Sent Events stream từ Backend (được kích hoạt bởi Redis SubClient)
    const eventSource = new EventSource(`${apiUrl}/api/pubsub/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [data, ...prev]);
      } catch (err) {
        console.error('Lỗi parse SSE:', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [apiUrl]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPublishing(true);
    try {
      await fetch(`${apiUrl}/api/pubsub/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, content, sender })
      });
      setContent('');
    } catch (err) {
      alert('Lỗi publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-purple" style={{ marginBottom: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              📡 REDIS PUB / SUB & SSE
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
              Trung Tâm Phát Tin Thời Gian Thực (Live Event Bus)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Mô hình Publish/Subscribe phân phối bản tin với độ trễ dưới 1 mili-giây tới hàng ngàn Subscribers cùng lúc.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={connected ? 'badge badge-green' : 'badge badge-red'}>
              {connected ? '🟢 SSE Connected' : '🔴 Reconnecting...'}
            </span>
            <button className="btn-secondary" onClick={() => setMessages([])}>
              🗑️ Xóa Lịch Sử
            </button>
          </div>
        </div>
      </div>

      {/* Publish Form */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
          📢 Xuất Bản Thông Báo Mới Lên Redis Channel (PUBLISH)
        </h4>

        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="FLASH_SALE">🔥 Khuyến Mãi (FLASH_SALE)</option>
              <option value="SYSTEM_ALERT">⚠️ Cảnh Báo Hệ Thống (SYSTEM_ALERT)</option>
              <option value="ORDER_UPDATE">📦 Đơn Hàng (ORDER_UPDATE)</option>
            </select>

            <input
              type="text"
              placeholder="Tên người gửi (Sender)..."
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              style={{
                width: '180px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />

            <input
              type="text"
              placeholder="Nội dung thông báo (Message content)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />

            <button type="submit" className="btn-primary" disabled={publishing}>
              {publishing ? 'Đang gửi...' : '🚀 Publish Ngay'}
            </button>
          </div>
        </form>
      </div>

      {/* Message Stream */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)' }}>
          Luồng Sự Kiện Đang Nhận (Incoming Message Stream via SSE)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              Đang chờ tin nhắn mới từ kênh Redis... Hãy nhập tin nhắn phía trên và bấm Publish!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{msg.topic}</span>
                    <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{msg.sender}</strong>
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{msg.content}</p>
                </div>

                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
