import React, { useState } from 'react';
import { Send, Zap, Clock, AlertOctagon, RefreshCw, ShoppingCart } from 'lucide-react';

export default function OrderSimulator({ onOrderSent }) {
  const [item, setItem] = useState('MacBook Pro M3 Max');
  const [amount, setAmount] = useState(3500);
  const [customer, setCustomer] = useState('kisu.enterprise@gmail.com');
  const [scenario, setScenario] = useState('normal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (selectedScenario = scenario, customAmount = amount) => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item,
          amount: Number(customAmount),
          customer,
          scenario: selectedScenario,
        }),
      });
      const data = await res.json();
      if (onOrderSent) onOrderSent(data);
    } catch (err) {
      console.error('Lỗi khi gửi đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
        <ShoppingCart className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Mô Phỏng Đơn Hàng & Thử Nghiệm DLQ</h2>
      </div>

      <div className="space-y-4">
        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Tên Sản Phẩm</label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Giá Trị ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Khách Hàng</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* 4 Interactive Quick Scenarios */}
        <div className="pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Chọn Kịch Bản Kiểm Thử Thực Tế:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Scenario 1: Happy Path */}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setScenario('normal');
                handleSubmit('normal', amount > 0 ? amount : 3500);
              }}
              className="btn btn-emerald flex-col !items-start !py-3 text-left group"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Zap className="w-4 h-4 text-emerald-300" />
                1. Đơn Hàng Hợp Lệ (Happy Path)
              </div>
              <span className="text-[11px] text-emerald-100/80 mt-1 font-normal leading-snug">
                Worker xử lý thành công ngay và gửi ACK hoàn tất.
              </span>
            </button>

            {/* Scenario 2: Transient Fail */}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setScenario('transient_fail');
                handleSubmit('transient_fail', 2500);
              }}
              className="btn btn-amber flex-col !items-start !py-3 text-left group"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-200" />
                2. Lỗi Mạng Tạm Thời (Transient)
              </div>
              <span className="text-[11px] text-amber-100/80 mt-1 font-normal leading-snug">
                Timeout 504. Đẩy vào Retry Queue 5s TTL x 3 lần ➔ Rơi vào DLQ!
              </span>
            </button>

            {/* Scenario 3: Poison Pill (Negative Amount) */}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setScenario('poison_pill');
                setAmount(-500);
                handleSubmit('poison_pill', -500);
              }}
              className="btn btn-danger flex-col !items-start !py-3 text-left group"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <AlertOctagon className="w-4 h-4 text-rose-200" />
                3. Thuốc Độc (Poison Pill)
              </div>
              <span className="text-[11px] text-rose-100/80 mt-1 font-normal leading-snug">
                Số tiền âm (-$500). Worker lập tức NACK requeue=false ➔ Bay thẳng DLQ!
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
