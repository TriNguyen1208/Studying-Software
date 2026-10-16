import React, { useState } from 'react';
import { Database, Lock, Key, ListOrdered, CheckCircle2, Clock } from 'lucide-react';

export default function StorageInspector({ idempotencyData, transactions }) {
  const [activeTab, setActiveTab] = useState('idempotency'); // 'idempotency' | 'locks' | 'ledger'

  const records = idempotencyData?.records || [];
  const activeLocks = idempotencyData?.activeLocks || [];
  const txList = transactions || [];

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Header Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="var(--indigo-500)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
            Hạ Tầng Lưu Trữ (PostgreSQL & Redis Storage State)
          </h3>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('idempotency')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: activeTab === 'idempotency' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeTab === 'idempotency' ? '#818cf8' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Key size={14} /> Idempotency Keys ({records.length})
          </button>

          <button
            onClick={() => setActiveTab('locks')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: activeTab === 'locks' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: activeTab === 'locks' ? 'var(--amber-400)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Lock size={14} /> Redis Locks ({activeLocks.length})
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: activeTab === 'ledger' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeTab === 'ledger' ? 'var(--emerald-400)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ListOrdered size={14} /> Sổ Cái Giao Dịch ({txList.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Idempotency Records Table */}
      {activeTab === 'idempotency' && (
        <div style={{ overflowX: 'auto' }}>
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chưa có Idempotency Key nào được ghi nhận trong cơ sở dữ liệu.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>IDEMPOTENCY KEY</th>
                  <th style={{ padding: '10px 12px' }}>REQUEST HASH (SHA-256)</th>
                  <th style={{ padding: '10px 12px' }}>STATUS</th>
                  <th style={{ padding: '10px 12px' }}>HTTP CODE</th>
                  <th style={{ padding: '10px 12px' }}>THỜI ĐIỂM</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-mono)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--emerald-400)' }}>
                      {r.key.slice(0, 18)}...
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {r.request_hash.slice(0, 16)}...
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        className={`badge ${
                          r.status === 'COMPLETED'
                            ? 'badge-emerald'
                            : r.status === 'IN_PROGRESS'
                            ? 'badge-amber'
                            : 'badge-rose'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>
                      {r.response_code || '---'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Redis Active Locks */}
      {activeTab === 'locks' && (
        <div style={{ overflowX: 'auto' }}>
          {activeLocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Hiện không có Distributed Lock nào đang active (tất cả các lock đều đã giải phóng hoặc hết TTL).
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>REDIS LOCK KEY</th>
                  <th style={{ padding: '10px 12px' }}>WORKER TOKEN (OWNER)</th>
                  <th style={{ padding: '10px 12px' }}>TTL CÒN LẠI</th>
                </tr>
              </thead>
              <tbody>
                {activeLocks.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-mono)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--amber-400)' }}>{l.lockKey}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{l.owner}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>{l.ttlMsRemaining} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Transactions Ledger */}
      {activeTab === 'ledger' && (
        <div style={{ overflowX: 'auto' }}>
          {txList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sổ cái trống. Chưa có giao dịch thành công nào được lưu vào PostgreSQL.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>MÃ GIAO DỊCH</th>
                  <th style={{ padding: '10px 12px' }}>TỪ TÀI KHOẢN</th>
                  <th style={{ padding: '10px 12px' }}>ĐẾN TÀI KHOẢN</th>
                  <th style={{ padding: '10px 12px' }}>SỐ TIỀN</th>
                  <th style={{ padding: '10px 12px' }}>IDEMPOTENCY KEY GẮN KÈM</th>
                  <th style={{ padding: '10px 12px' }}>THỜI GIAN</th>
                </tr>
              </thead>
              <tbody>
                {txList.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontFamily: 'var(--font-mono)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{tx.id.slice(0, 13)}...</td>
                    <td style={{ padding: '10px 12px', color: '#fff' }}>{tx.from_account}</td>
                    <td style={{ padding: '10px 12px', color: '#fff' }}>{tx.to_account}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--emerald-400)', fontWeight: 700 }}>
                      +${parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {tx.idempotency_key ? tx.idempotency_key.slice(0, 16) + '...' : 'NONE'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
