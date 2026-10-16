import React from 'react';
import { RefreshCw, Zap, Shield, ShieldAlert, Send, Copy, AlertTriangle, Layers } from 'lucide-react';

export default function ControlPanel({
  amount,
  setAmount,
  reason,
  setReason,
  idempotencyKey,
  generateNewKey,
  useIdempotency,
  setUseIdempotency,
  onSingleTransfer,
  onConcurrentStorm,
  onRetrySimulation,
  onTamperPayload,
  onResetDb,
  isLoading,
}) {
  const copyKeyToClipboard = () => {
    navigator.clipboard.writeText(idempotencyKey);
    alert('Đã copy Idempotency-Key vào Clipboard!');
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: useIdempotency ? 'var(--emerald-glow)' : 'var(--rose-glow)', padding: '8px', borderRadius: '8px' }}>
            {useIdempotency ? <Shield size={20} color="var(--emerald-400)" /> : <ShieldAlert size={20} color="var(--rose-500)" />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Bảng Điều Khiển Giao Dịch</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Cấu hình tham số và kích hoạt các kịch bản kiểm thử độ tin cậy
            </p>
          </div>
        </div>

        {/* Toggle Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '30px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: useIdempotency ? 'var(--emerald-400)' : 'var(--rose-500)' }}>
            {useIdempotency ? 'IDEMPOTENCY: BẬT' : 'IDEMPOTENCY: TẮT'}
          </span>
          <label className="switch">
            <input
              type="checkbox"
              checked={useIdempotency}
              onChange={(e) => setUseIdempotency(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Inputs Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 2fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
            Số tiền chuyển ($ USD)
          </label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
            Lý do giao dịch
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Idempotency-Key (UUIDv4)
            </label>
            <button
              onClick={generateNewKey}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--emerald-400)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={12} /> Tạo Key mới
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              readOnly
              value={idempotencyKey}
              style={{
                width: '100%',
                padding: '10px 40px 10px 14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--emerald-400)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
            <button
              onClick={copyKeyToClipboard}
              title="Copy Key"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons Matrix */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Action 1: Standard Transfer */}
          <button
            className="btn btn-primary"
            onClick={onSingleTransfer}
            disabled={isLoading}
            title="Thực hiện 1 giao dịch đơn lẻ tiêu chuẩn"
          >
            <Send size={16} /> Gửi 1 Giao Dịch
          </button>

          {/* Action 2: 5 Concurrent Storm */}
          <button
            className="btn btn-danger"
            onClick={onConcurrentStorm}
            disabled={isLoading}
            title="Mô phỏng spam click nhanh 5 lần cùng lúc với cùng 1 Idempotency Key"
          >
            <Zap size={16} /> Spam 5 Requests Đồng Thời (Race Condition)
          </button>

          {/* Action 3: Retry Simulation */}
          <button
            className="btn btn-warning"
            onClick={onRetrySimulation}
            disabled={isLoading}
            title="Mô phỏng rớt mạng Client timeout và gửi Retry lại với cùng key"
          >
            <RefreshCw size={16} /> Giả Lập Network Retry (Phục Hồi Cache)
          </button>

          {/* Action 4: Tamper Payload */}
          <button
            className="btn btn-secondary"
            onClick={onTamperPayload}
            disabled={isLoading}
            title="Dùng lại key cũ nhưng sửa số tiền thành $9,999 để test 422 Payload Mismatch"
          >
            <AlertTriangle size={16} color="var(--rose-500)" /> Thử Gian Lận Payload (422)
          </button>
        </div>

        {/* Reset Database Button */}
        <button
          className="btn btn-secondary"
          onClick={onResetDb}
          disabled={isLoading}
          style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--rose-500)' }}
          title="Khôi phục số dư gốc và xóa sạch dữ liệu cache/giao dịch"
        >
          <Layers size={16} /> Reset Môi Trường
        </button>
      </div>
    </div>
  );
}
