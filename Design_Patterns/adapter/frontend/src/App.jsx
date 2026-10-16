import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CheckoutTerminal from './components/CheckoutTerminal';
import ProtocolInspector from './components/ProtocolInspector';
import AdapterMatrix from './components/AdapterMatrix';
import ChaosSimulator from './components/ChaosSimulator';
import AuditLogs from './components/AuditLogs';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('checkout');
  const [lastPayload, setLastPayload] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handlePaymentSuccess(result) {
    setLastPayload(result);
    setRefreshTrigger((prev) => prev + 1);
  }

  function handleInspectPayload(payload) {
    setLastPayload(payload);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'checkout' && (
          <CheckoutTerminal
            onPaymentSuccess={handlePaymentSuccess}
            onInspectPayload={(p) => {
              handleInspectPayload(p);
              // Option to immediately see in inspector
            }}
          />
        )}

        {activeTab === 'inspector' && (
          <ProtocolInspector lastPayload={lastPayload} />
        )}

        {activeTab === 'matrix' && (
          <AdapterMatrix />
        )}

        {activeTab === 'chaos' && (
          <ChaosSimulator />
        )}

        {activeTab === 'audit' && (
          <AuditLogs
            refreshTrigger={refreshTrigger}
            onInspectTransaction={(t) => {
              setLastPayload(t);
              setActiveTab('inspector');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>OmniPay Platform • Adapter Design Pattern (Gang of Four) Production Implementation</p>
          <p className="text-slate-600">Hexagonal Architecture (Ports and Adapters) • Enterprise Resilience & Protocol Translation</p>
        </div>
      </footer>
    </div>
  );
}
