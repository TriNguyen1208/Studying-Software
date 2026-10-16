import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, Send, Hash, Activity, RefreshCw, Power, 
  Layers, ShieldAlert, Cpu, CheckCircle2, MessageSquare, Terminal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  
  // Trạng thái kết nối
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [serverNode, setServerNode] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [username, setUsername] = useState('Developer-' + Math.floor(Math.random() * 1000));
  
  // Tin nhắn & Logs
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [framesLog, setFramesLog] = useState([]);

  // Heartbeat & Latency
  const [latency, setLatency] = useState(null);
  const [heartbeatActive, setHeartbeatActive] = useState(true);
  const [reconnectCount, setReconnectCount] = useState(0);

  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  // ----------------------------------------------------------------------------
  // KHỞI TẠO & QUẢN LÝ KẾT NỐI WEBSOCKET
  // ----------------------------------------------------------------------------
  const connect = () => {
    // Kết nối tới WebSocket server qua cổng 4000
    const wsUrl = `ws://${window.location.hostname}:4000/ws`;
    const ws = new WebSocket(wsUrl);

    logFrame('OUT', 'HTTP Upgrade Request (GET /ws, Upgrade: websocket)');

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectCount(0);
      logFrame('IN', 'HTTP 101 Switching Protocols. Connection Upgraded to Full-Duplex!');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        logFrame('IN', `Opcode 0x1 [TEXT]: Type=${data.type}`);

        switch (data.type) {
          case 'CONNECTED':
            setSocketId(data.socketId);
            setServerNode(data.serverNode);
            setCurrentRoom(data.room);
            break;

          case 'ROOM_JOINED':
            setCurrentRoom(data.room);
            break;

          case 'NEW_MESSAGE':
            setMessages(prev => [...prev, data]);
            break;

          default:
            break;
        }
      } catch (err) {
        logFrame('IN', `Raw Frame: ${event.data}`);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      logFrame('EVENT', `Connection Closed. Code: ${event.code} (Reason: ${event.reason || 'Normal'})`);

      // Tự động kết nối lại theo chiến lược Exponential Backoff nếu không phải cố tình ngắt
      if (heartbeatActive) {
        const delay = Math.min(10000, 1000 * Math.pow(1.5, reconnectCount));
        setReconnectCount(c => c + 1);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      logFrame('ERROR', 'WebSocket encountered an error');
    };

    socketRef.current = ws;
  };

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ghi nhật ký Frame
  const logFrame = (direction, info) => {
    const newFrame = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      direction,
      info
    };
    setFramesLog(prev => [newFrame, ...prev.slice(0, 24)]);
  };

  // ----------------------------------------------------------------------------
  // HÀM GỬI TIN NHẮN
  // ----------------------------------------------------------------------------
  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    const payload = {
      type: 'CHAT_MESSAGE',
      senderName: username,
      text: inputText.trim()
    };

    socketRef.current.send(JSON.stringify(payload));
    logFrame('OUT', `Opcode 0x1 [MASKED]: ${inputText.trim().substring(0, 30)}...`);
    setInputText('');
  };

  // ----------------------------------------------------------------------------
  // ĐỔI PHÒNG CHAT (ROOM ISOLATION)
  // ----------------------------------------------------------------------------
  const switchRoom = (roomName) => {
    if (roomName === currentRoom || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(JSON.stringify({
      type: 'JOIN_ROOM',
      room: roomName
    }));
    logFrame('OUT', `Opcode 0x1 [MASKED]: Join Room #${roomName}`);
    setMessages([]); // Dọn dẹp tin nhắn phòng cũ
  };

  // ----------------------------------------------------------------------------
  // CHAOS: NGẮT / MỞ LẠI KẾT NỐI
  // ----------------------------------------------------------------------------
  const toggleConnection = () => {
    if (isConnected) {
      if (socketRef.current) socketRef.current.close(1000, 'User initiated close');
      setIsConnected(false);
    } else {
      connect();
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER SECTION */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)' }}>
              <Radio size={28} color="#000" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #00f2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                WebSocket Full-Duplex Real-Time Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                RFC 6455 Persistent Connection, Room Isolation & Redis Pub/Sub Distributed Architecture
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={isConnected ? 'badge badge-green' : 'badge badge-red'}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#00e676' : '#ff1744', display: 'inline-block' }}></span>
              {isConnected ? 'SOCKET OPEN (FULL-DUPLEX)' : 'DISCONNECTED'}
            </span>
            <button onClick={toggleConnection} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Power size={14} />
              {isConnected ? 'Ngắt Kết Nối' : 'Kết Nối Lại'}
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SOCKET IDENTIFIER</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ws-cyan)', fontFamily: 'var(--font-mono)' }}>
              {socketId ? socketId.substring(0, 13) + '...' : 'None'}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SERVER NODE ACTIVE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {serverNode || 'Connecting...'}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>PHÒNG HIỆN TẠI</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffd740' }}>
              #{currentRoom}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>TỔNG FRAME NHẬN/GỬI</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00e676' }}>
              {framesLog.length} frames
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTab('chat')}
          className={activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}
        >
          <MessageSquare size={16} />
          1. Multi-Room Live Chat
        </button>
        <button
          onClick={() => setActiveTab('frames')}
          className={activeTab === 'frames' ? 'btn-primary' : 'btn-secondary'}
        >
          <Terminal size={16} />
          2. Raw Frame Inspector (RFC 6455)
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={activeTab === 'telemetry' ? 'btn-primary' : 'btn-secondary'}
        >
          <Activity size={16} />
          3. Heartbeat & Chaos Telemetry
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MULTI-ROOM REAL-TIME CHAT */}
      {/* ==================================================================== */}
      {activeTab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
          {/* ROOM SELECTOR SIDEBAR */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Danh Sách Phòng
            </h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {['general', 'trading', 'gaming'].map(room => (
                <button
                  key={room}
                  onClick={() => switchRoom(room)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: currentRoom === room ? '1px solid var(--ws-cyan)' : '1px solid transparent',
                    background: currentRoom === room ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: currentRoom === room ? '#fff' : 'var(--text-muted)',
                    fontWeight: currentRoom === room ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Hash size={16} color={currentRoom === room ? 'var(--ws-cyan)' : 'var(--text-dim)'} />
                  #{room}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '32px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Biệt danh của bạn:</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* CHAT WINDOW */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
            {/* CHAT HEADER */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hash size={20} color="var(--ws-cyan)" />
                <strong style={{ fontSize: '1.1rem' }}>#{currentRoom}</strong>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Full-duplex stream active
              </span>
            </div>

            {/* MESSAGES STREAM */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  Chưa có tin nhắn trong #{currentRoom}. Hãy nhập tin nhắn bên dưới để kiểm chứng độ trễ thời gian thực!
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.senderId === socketId ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                      border: msg.senderId === socketId ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid var(--border-color)',
                      maxWidth: '85%',
                      alignSelf: msg.senderId === socketId ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.75rem' }}>
                      <strong style={{ color: msg.senderId === socketId ? 'var(--ws-cyan)' : '#ffd740' }}>{msg.senderName}</strong>
                      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="badge badge-purple" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                        {msg.serverNode}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#fff', wordBreak: 'break-word' }}>{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* INPUT BOX */}
            <form onSubmit={sendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder={isConnected ? `Nhập tin nhắn vào #${currentRoom}...` : 'Đang mất kết nối...'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <button type="submit" disabled={!isConnected || !inputText.trim()} className="btn-primary">
                <Send size={16} />
                Gửi (Enter)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: RAW FRAME & PROTOCOL INSPECTOR */}
      {/* ==================================================================== */}
      {activeTab === 'frames' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Nhật Ký Khung Nhị Phân (WebSocket Frames Stream)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
            WebSocket mã hóa dữ liệu thành các Frame siêu nhẹ. Mọi frame gửi từ Client lên Server đều bắt buộc mã hóa XOR Masking 4-byte (RFC 6455).
          </p>

          <div style={{ display: 'grid', gap: '8px' }}>
            {framesLog.map(frame => (
              <div
                key={frame.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem'
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', minWidth: '70px' }}>{frame.time}</span>
                <span className={frame.direction === 'OUT' ? 'badge badge-cyan' : frame.direction === 'IN' ? 'badge badge-green' : 'badge badge-amber'}>
                  {frame.direction}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{frame.info}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: HEARTBEAT & CHAOS TELEMETRY */}
      {/* ==================================================================== */}
      {activeTab === 'telemetry' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Cơ Chế Heartbeat & Phòng Vệ Kết Nối Ma (Ghost Connections)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
            Cứ mỗi 15 giây, Server tự động gửi gói tin Ping Frame (Opcode 0x9). Client tự động phản hồi Pong (Opcode 0xA).  
            Nếu Client bị sập nguồn đột ngột mà không kịp gửi TCP FIN, Server sẽ phát hiện và giải phóng RAM kịp thời.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CHỈ SỐ RECONNECT HIỆN TẠI</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ws-cyan)' }}>
                {reconnectCount} lần thử
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Exponential Backoff: Tránh bão kết nối (Thundering Herd)
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>BACKPRESSURE SAFEGUARD</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00e676' }}>
                PROTECTED
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Kiểm soát ws.bufferedAmount &lt; 1MB trên từng socket
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
