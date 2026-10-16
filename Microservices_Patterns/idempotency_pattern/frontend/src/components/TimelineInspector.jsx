import React from 'react';
import { Activity, Clock, CheckCircle2, XCircle, AlertCircle, Cpu } from 'lucide-react';

export default function TimelineInspector({ logs, onClearLogs }) {
  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--emerald-400)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
            Nhật Ký Request & Phản Hồi Thời Gian Thực (Live Inspector)
          </h3>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Xóa nhật ký
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '12px',
          }}
        >
          <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.875rem' }}>Chưa có yêu cầu nào được kích hoạt. Hãy bấm các nút bên trên để trải nghiệm!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
          {logs.map((log, index) => {
            const isSuccess = log.status >= 200 && log.status < 300;
            const isConflict = log.status === 409;
            const isUnprocessable = log.status === 422;
            const isCacheHit = log.cacheHeader.includes('HIT');

            return (
              <div
                key={index}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${
                    isSuccess
                      ? 'rgba(16, 185, 129, 0.2)'
                      : isConflict
                      ? 'rgba(245, 158, 11, 0.2)'
                      : isUnprocessable
                      ? 'rgba(244, 63, 94, 0.2)'
                      : 'var(--border-subtle)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* Status Icon & Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isSuccess ? (
                    <CheckCircle2 size={18} color="var(--emerald-400)" />
                  ) : isConflict ? (
                    <AlertCircle size={18} color="var(--amber-400)" />
                  ) : (
                    <XCircle size={18} color="var(--rose-500)" />
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-mono)',
                          color: isSuccess ? 'var(--emerald-400)' : isConflict ? 'var(--amber-400)' : 'var(--rose-500)',
                        }}
                      >
                        HTTP {log.status}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 500 }}>
                        {log.scenario || 'Giao dịch API'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Key: {log.idempotencyKey ? log.idempotencyKey.slice(0, 16) + '...' : 'NONE (Bypass)'} | {log.timestamp}
                    </div>
                  </div>
                </div>

                {/* Badges & Metrics */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Cache Header Badge */}
                  <span
                    className={`badge ${
                      isCacheHit ? 'badge-emerald' : log.cacheHeader === 'MISS' ? 'badge-amber' : 'badge-indigo'
                    }`}
                  >
                    <Cpu size={11} /> {log.cacheHeader}
                  </span>

                  {/* Replay Flag */}
                  {log.replayHeader === 'true' && (
                    <span className="badge badge-cyan" title="Kết quả được trả về từ bản ghi nhớ mà không chạy lại logic ghi">
                      REPLAYED
                    </span>
                  )}

                  {/* Duration */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: log.durationMs < 50 ? 'var(--emerald-400)' : 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {log.durationMs}ms
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
