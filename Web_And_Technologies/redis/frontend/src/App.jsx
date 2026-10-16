import React, { useState, useEffect } from 'react';
import CacheBenchmarkTab from './components/CacheBenchmarkTab';
import FlashSaleTab from './components/FlashSaleTab';
import RateLimiterTab from './components/RateLimiterTab';
import LeaderboardTab from './components/LeaderboardTab';
import PubSubTab from './components/PubSubTab';
import MetricsTab from './components/MetricsTab';

const API_URL = 'http://localhost:5001';

export default function App() {
  const [activeTab, setActiveTab] = useState('cache');
  const [backendStatus, setBackendStatus] = useState('CHECKING');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        setBackendStatus(data.redis === 'HEALTHY' ? 'ONLINE' : 'REDIS_DOWN');
      } catch (err) {
        setBackendStatus('OFFLINE');
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 5000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'cache', label: '⚡ Cache Aside & Benchmark', icon: '⚡' },
    { id: 'flash_sale', label: '⚔️ Flash Sale & Distributed Lock', icon: '🔒' },
    { id: 'ratelimit', label: '⏱️ Sliding Window Rate Limiter', icon: '🛡️' },
    { id: 'leaderboard', label: '🏆 Real-time Leaderboard', icon: '🥇' },
    { id: 'pubsub', label: '📡 Pub/Sub & SSE Stream', icon: '📢' },
    { id: 'metrics', label: '📊 Engine Internals & Metrics', icon: '🔬' },
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 20px 64px 20px' }}>
      {/* Top Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Redis Logo Mark */}
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444, #991b1b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '1.4rem'
          }}>
            R
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Redis Production Lab
              </h1>
              <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>ENTERPRISE DEMO</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Bản Mô Phỏng Kiến Trúc Chuyên Sâu: Caching, Distributed Locks, Rate Limiting &amp; Internals
            </p>
          </div>
        </div>

        {/* Backend & Redis Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: backendStatus === 'ONLINE' ? '#10b981' : '#ef4444',
              boxShadow: backendStatus === 'ONLINE' ? '0 0 10px #10b981' : '0 0 10px #ef4444'
            }} />
            <span style={{ color: 'var(--text-muted)' }}>Backend:</span>
            <strong style={{ color: backendStatus === 'ONLINE' ? '#34d399' : '#f87171' }}>
              {backendStatus}
            </strong>
          </div>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <nav style={{
        display: 'flex',
        gap: '8px',
        padding: '6px',
        background: 'rgba(18, 24, 38, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        marginBottom: '28px',
        overflowX: 'auto'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main>
        {activeTab === 'cache' && <CacheBenchmarkTab apiUrl={API_URL} />}
        {activeTab === 'flash_sale' && <FlashSaleTab apiUrl={API_URL} />}
        {activeTab === 'ratelimit' && <RateLimiterTab apiUrl={API_URL} />}
        {activeTab === 'leaderboard' && <LeaderboardTab apiUrl={API_URL} />}
        {activeTab === 'pubsub' && <PubSubTab apiUrl={API_URL} />}
        {activeTab === 'metrics' && <MetricsTab apiUrl={API_URL} />}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '64px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
        Kho Tài Liệu &amp; Thực Nghiệm Redis Chuyên Sâu • Hardcore Under The Hood &amp; Production Engineering
      </footer>
    </div>
  );
}
