import React, { useState, useEffect } from 'react';
import { RefreshCw, RotateCcw, CheckCircle, XCircle, Search, Clock, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogs({ refreshTrigger, onInspectTransaction }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refundingId, setRefundingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      const res = await api.getTransactions(30);
      if (res.success) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải giao dịch:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [refreshTrigger]);

  async function handleRefund(transactionId, amount) {
    setRefundingId(transactionId);
    setFeedback(null);
    try {
      const res = await api.refund({
        transactionId,
        amount,
        reason: 'Customer returned merchandise within 30 days'
      });
      setFeedback({
        type: 'success',
        message: `Đã hoàn tiền thành công qua Adapter! Refund ID: ${res.data.refundId || res.data.providerRefundId}`
      });
      await loadTransactions();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Hoàn tiền thất bại: ${err.message}`
      });
    } finally {
      setRefundingId(null);
    }
  }

  const filtered = transactions.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.id?.toLowerCase().includes(term) ||
      t.gateway_type?.toLowerCase().includes(term) ||
      t.provider_txn_id?.toLowerCase().includes(term) ||
      t.status?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-teal-950/40">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Sổ Cái Giao Dịch & Bàn Điều Khiển Hoàn Tiền (Refund Console)</span>
              <span className="badge badge-success text-[10px]">Audit Trail</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Mọi giao dịch thanh toán và yêu cầu hoàn tiền đều đi qua phương thức <code className="text-emerald-300 font-mono">adapter.processRefund()</code>. 
              Các Adapter tự động chuyển đổi cấu trúc hoàn tiền tương ứng cho Stripe, PayPal, VNPay và Ngân hàng.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-panel p-5 space-y-4">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pb-3 border-b border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo ID, Cổng, Mã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">Số Tiền</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Provider Ref ID</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 font-sans italic">
                    Không có giao dịch nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isRefunded = t.status === 'REFUNDED';
                  const isSuccess = t.status === 'SUCCESS';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-200 font-bold">{t.id}</td>
                      <td className="py-3 px-4">
                        <span className="badge badge-info text-[9px] uppercase">{t.gateway_type}</span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {t.currency === 'USD' ? `$${t.amount}` : `${Number(t.amount).toLocaleString('vi-VN')} ₫`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge text-[9px] ${
                            isSuccess ? 'badge-success' : isRefunded ? 'badge-pending' : 'badge-failed'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                        {t.provider_txn_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(t.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isSuccess && (
                          <button
                            onClick={() => handleRefund(t.id, t.amount)}
                            disabled={refundingId === t.id}
                            className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-sans font-semibold inline-flex items-center space-x-1 transition-all"
                          >
                            <RotateCcw className={`w-3 h-3 ${refundingId === t.id ? 'animate-spin' : ''}`} />
                            <span>{refundingId === t.id ? 'Đang hoàn...' : 'Hoàn tiền'}</span>
                          </button>
                        )}
                        {isRefunded && (
                          <span className="text-[11px] text-slate-500 font-sans italic">Đã hoàn tất</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
