import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Cpu, Database, Server } from 'lucide-react';
import WalletCard from './components/WalletCard';
import ControlPanel from './components/ControlPanel';
import TimelineInspector from './components/TimelineInspector';
import StorageInspector from './components/StorageInspector';
import {
  fetchAccounts,
  fetchTransactions,
  fetchIdempotencyRecords,
  executeTransfer,
  resetDatabase,
} from './services/api';

function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idemp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [idempotencyData, setIdempotencyData] = useState({ records: [], activeLocks: [] });
  const [amount, setAmount] = useState('50');
  const [reason, setReason] = useState('Thanh toán hóa đơn dịch vụ #9021');
  const [idempotencyKey, setIdempotencyKey] = useState(generateUuid());
  const [useIdempotency, setUseIdempotency] = useState(true);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Tải dữ liệu toàn hệ thống
  const loadSystemState = useCallback(async () => {
    try {
      const [accRes, txRes, idempRes] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchIdempotencyRecords(),
      ]);
      setAccounts(accRes.accounts || []);
      setTransactions(txRes.transactions || []);
      setIdempotencyData(idempRes || { records: [], activeLocks: [] });
    } catch (err) {
      console.error('Lỗi khi tải trạng thái hệ thống:', err);
    }
  }, []);

  useEffect(() => {
    loadSystemState();
    // Polling nhẹ mỗi 4 giây để đồng bộ trạng thái khi có nhiều client
    const timer = setInterval(loadSystemState, 4000);
    return () => clearInterval(timer);
  }, [loadSystemState]);

  const generateNewKey = () => {
    setIdempotencyKey(generateUuid());
  };

  // Kịch bản 1: Gửi 1 giao dịch đơn lẻ
  const handleSingleTransfer = async () => {
    setIsLoading(true);
    setIsTransferring(true);
    try {
      const res = await executeTransfer({
        amount,
        reason,
        idempotencyKey: useIdempotency ? idempotencyKey : null,
        bypassIdempotency: !useIdempotency,
      });

      setLogs((prev) => [
        {
          scenario: 'Giao dịch đơn lẻ',
          idempotencyKey: useIdempotency ? idempotencyKey : null,
          ...res,
        },
        ...prev,
      ]);
      await loadSystemState();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsTransferring(false);
    }
  };

  // Kịch bản 2: Spam 5 requests đồng thời (Race Condition test)
  const handleConcurrentStorm = async () => {
    setIsLoading(true);
    setIsTransferring(true);

    const stormKey = useIdempotency ? idempotencyKey : null;

    try {
      // Bắn 5 request cùng 1 lúc với Promise.all
      const requests = Array.from({ length: 5 }).map((_, index) =>
        executeTransfer({
          amount,
          reason: `${reason} [Storm #${index + 1}]`,
          idempotencyKey: stormKey,
          bypassIdempotency: !useIdempotency,
          delayMs: 700,
        }).then((res) => ({
          scenario: `Storm Request #${index + 1}`,
          idempotencyKey: stormKey,
          ...res,
        }))
      );

      const results = await Promise.all(requests);
      setLogs((prev) => [...results, ...prev]);
      await loadSystemState();
    } catch (err) {
      console.error('Storm error:', err);
    } finally {
      setIsLoading(false);
      setIsTransferring(false);
    }
  };

  // Kịch bản 3: Giả lập Client Timeout & Retry
  const handleRetrySimulation = async () => {
    setIsLoading(true);
    setIsTransferring(true);

    const retryKey = useIdempotency ? idempotencyKey : null;

    try {
      // Request 1: Lần đầu tiên
      const firstRes = await executeTransfer({
        amount,
        reason: `${reason} (Gốc)`,
        idempotencyKey: retryKey,
        bypassIdempotency: !useIdempotency,
        delayMs: 600,
      });

      setLogs((prev) => [
        {
          scenario: 'Lần gọi đầu (Original)',
          idempotencyKey: retryKey,
          ...firstRes,
        },
        ...prev,
      ]);

      // Giả lập Client bị timeout, chờ 800ms rồi retry lại
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Request 2: Retry lại với cùng Key
      const retryRes = await executeTransfer({
        amount,
        reason: `${reason} (Gốc)`,
        idempotencyKey: retryKey,
        bypassIdempotency: !useIdempotency,
        delayMs: 600,
      });

      setLogs((prev) => [
        {
          scenario: 'Lần Retry (Network Reconnect)',
          idempotencyKey: retryKey,
          ...retryRes,
        },
        ...prev,
      ]);

      await loadSystemState();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsTransferring(false);
    }
  };

  // Kịch bản 4: Thử gian lận/thay đổi Payload (Tamper Payload)
  const handleTamperPayload = async () => {
    setIsLoading(true);
    try {
      const res = await executeTransfer({
        amount: '9999.00', // Đổi số tiền khác hoàn toàn so với ban đầu
        reason: 'Gian lận đổi số tiền thành $9,999!',
        idempotencyKey: useIdempotency ? idempotencyKey : null,
        bypassIdempotency: !useIdempotency,
      });

      setLogs((prev) => [
        {
          scenario: 'Thử đổi Payload với cùng Key cũ',
          idempotencyKey: useIdempotency ? idempotencyKey : null,
          ...res,
        },
        ...prev,
      ]);
      await loadSystemState();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Khôi phục Database
  const handleResetDb = async () => {
    if (!confirm('Bạn có chắc chắn muốn reset toàn bộ số dư và xóa sạch Idempotency Keys?')) return;
    setIsLoading(true);
    try {
      await resetDatabase();
      generateNewKey();
      setLogs([]);
      await loadSystemState();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 20px 80px' }}>
      {/* Top Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--emerald-500), #047857)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <ShieldCheck size={26} color="#fff" />
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
                NexusPay • Distributed Idempotency Engine
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '750px' }}>
              Mô phỏng cơ chế Idempotency chuẩn IETF draft specification cho hệ thống giao dịch tài chính phân tán. 
              Bảo vệ dòng tiền chống lại Double Spending, Network Retry Storm và Race Conditions.
            </p>
          </div>

          {/* Infrastructure Health Badges */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-emerald">
              <Server size={12} /> Backend :5002
            </span>
            <span className="badge badge-indigo">
              <Database size={12} /> Postgres :5434
            </span>
            <span className="badge badge-rose">
              <Cpu size={12} /> Redis :6383
            </span>
            <button
              onClick={loadSystemState}
              title="Đồng bộ dữ liệu"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
              }}
            >
              <RefreshCw size={12} /> Làm mới
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {/* 1. Wallet Balances */}
        <WalletCard accounts={accounts} isTransferring={isTransferring} />

        {/* 2. Control Panel with Action Buttons */}
        <ControlPanel
          amount={amount}
          setAmount={setAmount}
          reason={reason}
          setReason={setReason}
          idempotencyKey={idempotencyKey}
          generateNewKey={generateNewKey}
          useIdempotency={useIdempotency}
          setUseIdempotency={setUseIdempotency}
          onSingleTransfer={handleSingleTransfer}
          onConcurrentStorm={handleConcurrentStorm}
          onRetrySimulation={handleRetrySimulation}
          onTamperPayload={handleTamperPayload}
          onResetDb={handleResetDb}
          isLoading={isLoading}
        />

        {/* 3. Live Request Timeline Inspector */}
        <TimelineInspector logs={logs} onClearLogs={() => setLogs([])} />

        {/* 4. Underlying Storage State (PostgreSQL & Redis) */}
        <StorageInspector idempotencyData={idempotencyData} transactions={transactions} />
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '50px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
        Distributed Systems & Microservices Patterns • Idempotency Pattern Deep Dive • Studying-Software
      </footer>
    </div>
  );
}
