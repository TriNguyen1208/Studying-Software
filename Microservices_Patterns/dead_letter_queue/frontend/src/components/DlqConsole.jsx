import React, { useState } from 'react';
import { Skull, RefreshCw, Trash2, Edit3, ArrowUpRight, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function DlqConsole({ deadLetters, onRefresh, onActionSuccess }) {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingPayload, setEditingPayload] = useState(null);
  const [isRedriving, setIsRedriving] = useState(false);

  const handleOpenEdit = (msg) => {
    setSelectedMessage(msg);
    setEditingPayload(JSON.stringify(msg.payload, null, 2));
  };

  const handleCloseEdit = () => {
    setSelectedMessage(null);
    setEditingPayload(null);
  };

  const handleRedrive = async (orderId, customPayload = null) => {
    setIsRedriving(true);
    try {
      const res = await fetch(`/api/dlq/redrive/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedPayload: customPayload }),
      });
      const data = await res.json();
      if (data.success) {
        handleCloseEdit();
        if (onActionSuccess) onActionSuccess(data.message);
        if (onRefresh) onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Lỗi khi redrive:', err);
    } finally {
      setIsRedriving(false);
    }
  };

  const handleRedriveAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn TÁI SINH toàn bộ tin nhắn trong DLQ về Main Queue?')) return;
    setIsRedriving(true);
    try {
      const res = await fetch('/api/dlq/redrive-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (onActionSuccess) onActionSuccess(data.message);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Lỗi khi redrive all:', err);
    } finally {
      setIsRedriving(false);
    }
  };

  const handleDiscard = async (orderId) => {
    if (!confirm(`Bạn có chắc muốn TIÊU HỦY vĩnh viễn tin nhắn [${orderId}] khỏi DLQ?`)) return;
    try {
      const res = await fetch(`/api/dlq/discard/${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (onActionSuccess) onActionSuccess(data.message);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Lỗi khi discard:', err);
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-white">Bảng Quản Trị Dead Letter Queue (DLQ Redrive Console)</h2>
            <span className="badge badge-rose">{deadLetters.length} tin nhắn tử vong</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kiểm tra "Giấy chứng tử" (x-death), chỉnh sửa dữ liệu lỗi và tái sinh tin nhắn về hàng đợi chính.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-outline text-xs !py-1.5 !px-3"
            title="Làm mới danh sách"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm Mới
          </button>

          {deadLetters.length > 0 && (
            <button
              type="button"
              disabled={isRedriving}
              onClick={handleRedriveAll}
              className="btn btn-emerald text-xs !py-1.5 !px-3"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Tái Sinh Tất Cả ({deadLetters.length})
            </button>
          )}
        </div>
      </div>

      {deadLetters.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
          <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Dead Letter Queue Trống</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Không có tin nhắn nào bị tử vong. Hãy thử bấm nút <strong className="text-amber-400">"Lỗi Mạng Tạm Thời"</strong> hoặc <strong className="text-rose-400">"Thuốc Độc (Poison Pill)"</strong> ở trên để xem DLQ kích hoạt!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deadLetters.map((msg) => {
            const deathInfo = msg.deathDetails || {};
            const isPoison = msg.payload?.amount <= 0 || msg.deathReason === 'rejected';

            return (
              <div
                key={msg.orderId}
                className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 hover:border-rose-500/40 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-rose-300">{msg.orderId}</span>
                    <span className={`badge ${isPoison ? 'badge-rose' : 'badge-amber'}`}>
                      {isPoison ? '☠️ POISON PILL' : 'MAX RETRIES EXCEEDED'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Vào DLQ: {new Date(msg.receivedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRedriving}
                      onClick={() => handleOpenEdit(msg)}
                      className="btn btn-primary text-xs !py-1 !px-2.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Sửa & Tái Sinh
                    </button>

                    <button
                      type="button"
                      disabled={isRedriving}
                      onClick={() => handleRedrive(msg.orderId)}
                      className="btn btn-outline text-xs !py-1 !px-2.5 text-emerald-400 hover:border-emerald-500"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Replay Ngay
                    </button>

                    <button
                      type="button"
                      disabled={isRedriving}
                      onClick={() => handleDiscard(msg.orderId)}
                      className="btn btn-outline text-xs !py-1 !px-2 text-rose-400 hover:border-rose-500"
                      title="Tiêu hủy tin nhắn này khỏi DLQ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Death Anatomy Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-black/40 p-2.5 rounded-lg border border-white/5">
                  <div>
                    <span className="text-slate-500">Death Reason:</span>{' '}
                    <span className="text-rose-400 font-bold">{msg.deathReason}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Origin Queue:</span>{' '}
                    <span className="text-indigo-300">{deathInfo.queue || 'orders.main.q'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Death Count:</span>{' '}
                    <span className="text-amber-400">{deathInfo.count || 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Routing Key:</span>{' '}
                    <span className="text-slate-300">{deathInfo.routingKeys?.[0] || 'orders.dead'}</span>
                  </div>
                </div>

                {/* Payload Preview */}
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs font-mono overflow-x-auto text-slate-300">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-sans font-bold">
                    Dữ Liệu Payload Đang Bị Lỗi:
                  </div>
                  <pre>{JSON.stringify(msg.payload, null, 2)}</pre>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit & Redrive Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-lg w-full border border-indigo-500/30 bg-slate-900/95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Chỉnh Sửa Dữ Liệu & Tái Sinh Đơn Hàng</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sửa đổi các trường dữ liệu gây lỗi (ví dụ đổi giá tiền âm <code className="text-rose-400">amount: -500</code> thành giá dương hợp lệ <code className="text-emerald-400">amount: 2500</code>) rồi tái sinh tin nhắn về Main Queue.
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Payload JSON:</label>
              <textarea
                rows={8}
                value={editingPayload}
                onChange={(e) => setEditingPayload(e.target.value)}
                className="w-full bg-black/60 border border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="btn btn-outline text-xs !py-1.5"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isRedriving}
                onClick={() => {
                  try {
                    const parsed = JSON.parse(editingPayload);
                    handleRedrive(selectedMessage.orderId, parsed);
                  } catch (e) {
                    alert('Cú pháp JSON không hợp lệ: ' + e.message);
                  }
                }}
                className="btn btn-primary text-xs !py-1.5"
              >
                {isRedriving ? 'Đang Tái Sinh...' : 'Lưu Thay Đổi & Đẩy Lại Main Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
