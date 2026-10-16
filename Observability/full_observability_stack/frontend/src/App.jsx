import React, { useState, useEffect } from 'react';
import OrderFlowTab from './components/OrderFlowTab';
import TracesTab from './components/TracesTab';
import MetricsTab from './components/MetricsTab';
import LogsTab from './components/LogsTab';
import ChaosGeneratorTab from './components/ChaosGeneratorTab';
import StackOverviewTab from './components/StackOverviewTab';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Kiểm tra tình trạng kết nối Backend
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
        setBackendOnline(res.ok);
      } catch (_err) {
        setBackendOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'orders', label: 'Đặt Hàng & Giao Dịch', icon: '🛒' },
    { id: 'traces', label: 'Jaeger Tracing (Waterfall)', icon: '⚡' },
    { id: 'metrics', label: 'Prometheus (Golden Signals)', icon: '🔥' },
    { id: 'logs', label: 'Loki (Correlated Logs)', icon: '📜' },
    { id: 'chaos', label: 'Chaos Lab (Tiêm Sự Cố)', icon: '🧪' },
    { id: 'overview', label: 'Kiến Trúc & Khái Niệm', icon: '🏛️' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header style={{
        background: 'rgba(16, 21, 36, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.85rem 1.5rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #e6522c, #f46800, #60c5ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 0 15px rgba(244, 104, 0, 0.35)'
            }}>
              🔭
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="text-gradient">Observability Studio</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>| PLGJ Stack</span>
              </h1>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
                Prometheus • Grafana • Loki • Jaeger (OTel SDK)
              </div>
            </div>
          </div>

          {/* Backend Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              background: backendOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: backendOnline ? '#34d399' : '#f87171'
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: backendOnline ? '#10b981' : '#ef4444',
                boxShadow: backendOnline ? '0 0 8px #10b981' : 'none'
              }} />
              <span>{backendOnline ? 'Backend Online (Port 5001)' : 'Backend Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '1.5rem', flex: 1 }}>
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
          overflowX: 'auto'
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: isActive ? '#f8fafc' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        {activeTab === 'orders' && (
          <OrderFlowTab
            apiBase={API_BASE}
            selectedTraceId={selectedTraceId}
            setSelectedTraceId={(id) => {
              setSelectedTraceId(id);
              setActiveTab('traces');
            }}
          />
        )}

        {activeTab === 'traces' && (
          <TracesTab
            apiBase={API_BASE}
            selectedTraceId={selectedTraceId}
            setSelectedTraceId={setSelectedTraceId}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsTab apiBase={API_BASE} />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            apiBase={API_BASE}
            selectedTraceId={selectedTraceId}
            setSelectedTraceId={setSelectedTraceId}
            onSwitchToTraceTab={() => setActiveTab('traces')}
          />
        )}

        {activeTab === 'chaos' && (
          <ChaosGeneratorTab
            apiBase={API_BASE}
            onActionComplete={() => {}}
          />
        )}

        {activeTab === 'overview' && (
          <StackOverviewTab />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '1.25rem 1.5rem',
        background: 'rgba(10, 13, 20, 0.8)',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        textAlign: 'center'
      }}>
        Observability Deep Dive Production-Grade Demo • Prometheus • Grafana • Loki • Jaeger • OpenTelemetry SDK
      </footer>
    </div>
  );
}
