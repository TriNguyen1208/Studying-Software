import React, { useState, useEffect } from 'react';

export default function LeaderboardTab({ apiUrl }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerScore, setNewPlayerScore] = useState(5000);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leaderboard?top=10`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setTotalPlayers(data.totalPlayers || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [apiUrl]);

  const handleIncrement = async (playerName, delta) => {
    try {
      await fetch(`${apiUrl}/api/leaderboard/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, delta })
      });
      await fetchLeaderboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      await fetch(`${apiUrl}/api/leaderboard/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newPlayerName.trim(), delta: newPlayerScore })
      });
      setNewPlayerName('');
      await fetchLeaderboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${apiUrl}/api/leaderboard/reset`, { method: 'POST' });
      await fetchLeaderboard();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Info */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-amber" style={{ marginBottom: '8px' }}>
              🏆 REDIS SORTED SET (ZSET)
            </span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
              Bảng Xếp Hạng Gaming Siêu Tốc (Real-Time Leaderboard)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Cập nhật điểm và tính toán thứ tự tức thì với độ phức tạp <code className="font-mono" style={{ color: '#fcd34d' }}>O(log N)</code> nhờ cấu trúc <strong>SkipList</strong> trong RAM.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>TỔNG NGƯỜI CHƠI</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {totalPlayers}
              </div>
            </div>

            <button className="btn-secondary" onClick={handleReset}>
              🔄 Reset Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Add Player Form */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Tên game thủ mới (ví dụ: DragonSlayer)..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            style={{
              flex: '1',
              minWidth: '220px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />

          <input 
            type="number" 
            placeholder="Điểm khởi đầu"
            value={newPlayerScore}
            onChange={(e) => setNewPlayerScore(parseInt(e.target.value || '0', 10))}
            style={{
              width: '140px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: 'var(--font-mono)'
            }}
          />

          <button type="submit" className="btn-primary">
            ➕ Thêm Game Thủ
          </button>
        </form>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)' }}>
          Top 10 Game Thủ Dẫn Đầu (Được sắp xếp tự động trong RAM)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((item) => {
            const isTop3 = item.rank <= 3;
            const rankColors = {
              1: 'linear-gradient(135deg, #f59e0b, #d97706)',
              2: 'linear-gradient(135deg, #94a3b8, #64748b)',
              3: 'linear-gradient(135deg, #b45309, #78350f)',
            };

            return (
              <div 
                key={item.playerName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: isTop3 ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isTop3 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: '12px',
                  transition: 'transform 0.2s ease',
                }}
              >
                {/* Rank & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: rankColors[item.rank] || 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    #{item.rank}
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                      {item.playerName}
                    </span>
                  </div>
                </div>

                {/* Score & Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 800, 
                    color: isTop3 ? '#fcd34d' : '#e2e8f0', 
                    fontFamily: 'var(--font-mono)' 
                  }}>
                    {item.score.toLocaleString()} pts
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleIncrement(item.playerName, 200)}
                      title="Tăng 200 điểm (ZINCRBY)"
                    >
                      +200
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#f87171' }}
                      onClick={() => handleIncrement(item.playerName, -150)}
                      title="Trừ 150 điểm (ZINCRBY)"
                    >
                      -150
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
