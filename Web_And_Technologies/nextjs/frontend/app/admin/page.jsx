'use client';

/**
 * app/admin/page.jsx - Admin Realtime Dashboard (Client Component với Server-Sent Events)
 * 
 * 💡 BẢN CHẤT LÕI TÍCH HỢP NEXT.JS & NODE.JS:
 * - Trang này mở một kết nối một chiều HTTP SSE (EventSource) tới Node.js Backend tại http://localhost:5001/api/events.
 * - Bất cứ khi nào có đơn hàng được tạo (từ Next.js Server Action), Node.js backend lập tức phát sóng (broadcast)
 *   sự kiện tới dashboard này trong thời gian thực mà không cần polling liên tục!
 */

import { useState, useEffect } from 'react';
import { Activity, Radio, ShoppingCart, RefreshCw, Layers, CheckCircle2, Clock } from 'lucide-react';

export default function AdminPage() {
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING'); // CONNECTING | CONNECTED | DISCONNECTED

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

  // 1. Tải danh sách đơn hàng ban đầu
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/orders`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error('Lỗi khi fetch orders ban đầu:', e);
    }
  };

  useEffect(() => {
    fetchOrders();

    // 2. Mở kết nối Server-Sent Events (SSE) tới Node.js API
    const eventSource = new EventSource(`${BACKEND_URL}/events`);

    eventSource.onopen = () => {
      setConnectionStatus('CONNECTED');
    };

    eventSource.addEventListener('CONNECTED', (e) => {
      const data = JSON.parse(e.data);
      addEventLog('CONNECTED', data.message);
    });

    eventSource.addEventListener('ORDER_CREATED', (e) => {
      const data = JSON.parse(e.data);
      addEventLog('ORDER_CREATED', data.message);
      // Cập nhật danh sách đơn hàng live
      setOrders(prev => [data.order, ...prev]);
    });

    eventSource.addEventListener('INVENTORY_UPDATED', (e) => {
      const data = JSON.parse(e.data);
      addEventLog('INVENTORY_UPDATED', `Sản phẩm ${data.productId} vừa cập nhật tồn kho còn: ${data.newStock}`);
    });

    eventSource.onerror = () => {
      setConnectionStatus('DISCONNECTED');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const addEventLog = (type, message) => {
    setEvents(prev => [
      {
        id: Date.now() + Math.random(),
        type,
        message,
        time: new Date().toLocaleTimeString()
      },
      ...prev.slice(0, 19) // Giữ 20 events gần nhất
    ]);
  };

  return (
    <div className="space-y-8">
      
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Live Stream Monitor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát luồng sự kiện thời gian thực giữa <strong>Next.js App Router</strong> và <strong>Node.js Backend SSE</strong>.
          </p>
        </div>

        {/* Connection Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-white shadow-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${
            connectionStatus === 'CONNECTED'
              ? 'bg-emerald-500 animate-ping'
              : connectionStatus === 'CONNECTING'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-rose-500'
          }`}></span>
          <span className="text-slate-700 font-mono text-[11px]">
            Node.js SSE: <strong>{connectionStatus}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cột Trái: Danh Sách Đơn Hàng Mới Nhất */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-sky-600" />
                <span>Đơn Hàng Thực Tế ({orders.length})</span>
              </h3>
              <button
                onClick={fetchOrders}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                title="Tải lại đơn hàng"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Chưa có đơn hàng nào. Hãy đặt thử 1 đơn tại trang Checkout để thấy đơn nhảy live!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3">
                {orders.map((ord) => (
                  <div key={ord.id} className="pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 font-mono">#{ord.id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-800">{ord.customerName}</span>
                        <span className="text-slate-400 ml-2">({ord.email})</span>
                      </div>
                      <span className="font-black text-slate-900 text-sm">${ord.totalAmount}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      {ord.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Live SSE Event Stream Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-sky-400">
                <Radio className="w-4 h-4 animate-pulse text-rose-500" />
                <span>Live Event Stream (SSE)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{events.length} events captured</span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  Đang lắng nghe gói tin từ Node.js Backend...
                </div>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${
                        ev.type === 'ORDER_CREATED' ? 'text-emerald-400' :
                        ev.type === 'INVENTORY_UPDATED' ? 'text-amber-400' : 'text-sky-400'
                      }`}>
                        [{ev.type}]
                      </span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.time}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                      {ev.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
