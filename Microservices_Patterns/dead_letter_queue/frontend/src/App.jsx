import React, { useState, useEffect } from 'react';
import { Skull, Layers, Radio, ExternalLink, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import TopologyOverview from './components/TopologyOverview.jsx';
import OrderSimulator from './components/OrderSimulator.jsx';
import DlqConsole from './components/DlqConsole.jsx';
import LiveEventStream from './components/LiveEventStream.jsx';

export default function App() {
  const [stats, setStats] = useState(null);
  const [deadLetters, setDeadLetters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error('Không thể lấy stats:', e);
    }
  };

  const fetchDlqMessages = async () => {
    try {
      const res = await fetch('/api/dlq/messages');
      const data = await res.json();
      if (data.success) setDeadLetters(data.messages);
    } catch (e) {
      console.error('Không thể lấy DLQ messages:', e);
    }
  };

  const fetchInitialLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (e) {
      console.error('Không thể lấy logs:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDlqMessages();
    fetchInitialLogs();

    // Kết nối Server-Sent Events (SSE) để nhận cập nhật thời gian thực
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.data) {
          setLogs((prev) => [payload.data, ...prev].slice(0, 100));
        }

        // Tự động cập nhật số liệu khi có sự kiện liên quan
        if (
          payload.event === 'DEAD_LETTER_CAPTURED' ||
          payload.event === 'DLQ_MESSAGE_REDRIVEN' ||
          payload.event === 'DLQ_MESSAGE_DISCARDED' ||
          payload.event === 'PROCESSING_SUCCESS' ||
          payload.event === 'ORDER_PUBLISHED'
        ) {
          fetchStats();
          fetchDlqMessages();

          if (payload.event === 'DEAD_LETTER_CAPTURED') {
            showToast(`🚨 Tin nhắn tử vong mới trong DLQ: [${payload.data.data.orderId}]!`, 'danger');
          } else if (payload.event === 'DLQ_MESSAGE_REDRIVEN') {
            showToast(`✨ Đã tái sinh đơn [${payload.data.data.orderId}] về Main Queue!`, 'success');
          }
        }
      } catch (err) {
        console.error('Lỗi phân tích SSE:', err);
      }
    };

    eventSource.onerror = (e) => {
      console.warn('SSE gián đoạn, trình duyệt sẽ tự động kết nối lại...', e);
    };

    const interval = setInterval(() => {
      fetchStats();
      fetchDlqMessages();
    }, 4000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen text-slate-100 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 backdrop-blur-md animate-bounce ${
            notification.type === 'danger'
              ? 'bg-rose-950/90 border-rose-500 text-rose-200'
              : notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-indigo-950/90 border-indigo-500 text-indigo-200'
          }`}
        >
          {notification.type === 'danger' ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
              <Skull className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Dead Letter Queue (DLQ) & Redrive Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Mô phỏng kiến trúc cách ly Poison Pill, Delayed TTL Retry và phục hồi dữ liệu trong Microservices
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="http://localhost:15672"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline text-xs !py-2 !px-3"
            title="Mở giao diện quản trị RabbitMQ chính thức (guest / guest)"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            RabbitMQ Management (Port 15672)
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <div className="glass-panel px-3 py-1.5 flex items-center gap-2 border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-300 font-semibold">AMQP Broker Ready</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="space-y-8">
        {/* Topology & Queue State */}
        <TopologyOverview stats={stats} />

        {/* Order Simulator & Live Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-8">
            <OrderSimulator onOrderSent={() => { fetchStats(); fetchDlqMessages(); }} />
          </div>
          <div className="lg:col-span-6">
            <LiveEventStream logs={logs} onClear={() => setLogs([])} />
          </div>
        </div>

        {/* DLQ Management & Redrive Console */}
        <DlqConsole
          deadLetters={deadLetters}
          onRefresh={fetchDlqMessages}
          onActionSuccess={(msg) => showToast(msg, 'success')}
        />
      </main>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-[rgba(255,255,255,0.06)] text-center text-xs text-slate-500">
        <p>Microservices Patterns Series • Dead Letter Queue (DLQ) Pattern • Built for High Availability & Zero Data Loss</p>
      </footer>
    </div>
  );
}
