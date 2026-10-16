import React from 'react';
import { ArrowRight, UserCheck, ShieldCheck, Wallet } from 'lucide-react';

export default function WalletCard({ accounts, isTransferring }) {
  const alice = accounts.find((a) => a.account_number === 'ACC-1001') || {
    holder_name: 'Alice Johnson',
    balance: '1000.00',
    account_number: 'ACC-1001',
  };

  const bob = accounts.find((a) => a.account_number === 'ACC-2002') || {
    holder_name: 'Bob Smith',
    balance: '100.00',
    account_number: 'ACC-2002',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center', marginBottom: '28px' }}>
      {/* Sender: Alice */}
      <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '8px' }}>
              <UserCheck size={13} /> SENDER (NGUỒN)
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>{alice.holder_name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {alice.account_number}
            </span>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
            <Wallet size={24} color="var(--emerald-400)" />
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Số dư khả dụng
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--emerald-400)', fontFamily: 'var(--font-heading)' }}>
            ${parseFloat(alice.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Transaction Flow Indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isTransferring ? 'var(--emerald-500)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: isTransferring ? '0 0 20px var(--emerald-glow)' : 'none',
          }}
          className={isTransferring ? 'animate-pulse-glow' : ''}
        >
          <ArrowRight size={22} color={isTransferring ? '#fff' : 'var(--text-secondary)'} />
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
          {isTransferring ? 'Processing' : 'Safe Ledger'}
        </span>
      </div>

      {/* Receiver: Bob */}
      <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '8px' }}>
              <ShieldCheck size={13} /> RECEIVER (ĐÍCH)
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>{bob.holder_name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {bob.account_number}
            </span>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '12px' }}>
            <Wallet size={24} color="#818cf8" />
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Số dư khả dụng
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#818cf8', fontFamily: 'var(--font-heading)' }}>
            ${parseFloat(bob.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
