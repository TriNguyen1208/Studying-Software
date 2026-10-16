import React, { useState } from 'react';
import Navbar from './components/Navbar';
import PipelineStudio from './components/PipelineStudio';
import OnionInspector from './components/OnionInspector';
import BenchmarkArena from './components/BenchmarkArena';
import DecoratorMatrix from './components/DecoratorMatrix';
import AuditTrail from './components/AuditTrail';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [lastResult, setLastResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function handleExecuteSuccess(result) {
    setLastResult(result);
    setRefreshTrigger((prev) => prev + 1);
  }

  function handleInspectContext(result) {
    setLastResult(result);
    // User can manually go to Onion Inspector
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'studio' && (
          <PipelineStudio
            onExecuteSuccess={handleExecuteSuccess}
            onInspectContext={handleInspectContext}
          />
        )}

        {activeTab === 'onion' && (
          <OnionInspector lastResult={lastResult} />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkArena />
        )}

        {activeTab === 'matrix' && (
          <DecoratorMatrix />
        )}

        {activeTab === 'audit' && (
          <AuditTrail refreshTrigger={refreshTrigger} />
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>OmniStream Pipeline Engine • Decorator Design Pattern (Gang of Four) Production Implementation</p>
          <p className="text-slate-600">Dynamic Composition • Call Stack Unwinding • Onion Skin Layer-by-Layer Architecture</p>
        </div>
      </footer>
    </div>
  );
}
