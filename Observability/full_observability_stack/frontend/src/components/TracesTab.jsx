import React, { useState, useEffect } from 'react';

export default function TracesTab({ apiBase, selectedTraceId, setSelectedTraceId }) {
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/api/orders/recent`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setRecentOrders(data.data);
          if (!selectedTraceId) {
            setSelectedTraceId(data.data[0].traceId);
          }
        }
      })
      .catch(() => {});
  }, [apiBase]);

  useEffect(() => {
    if (recentOrders.length > 0) {
      const found = recentOrders.find((o) => o.traceId === selectedTraceId) || recentOrders[0];
      setActiveOrder(found);
    }
  }, [selectedTraceId, recentOrders]);

  const maxDuration = activeOrder ? Math.max(...activeOrder.spansTimeline.map((s) => s.offsetMs + s.durationMs), activeOrder.durationMs, 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Direct Jaeger Links */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-jaeger)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-jaeger)' }}>⚡</span> Jaeger Distributed Tracing (Waterfall Visualizer)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Theo dõi vết gọi phân tán (Spans). Mỗi span thể hiện một đơn vị công việc độc lập trong hành trình request.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a
              href="http://localhost:16686"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: 'rgba(96, 197, 234, 0.15)',
                color: '#60c5ea',
                border: '1px solid rgba(96, 197, 234, 0.4)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <span>Mở Jaeger Web UI (Port 16686)</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Bộ chọn Trace ID */}
        <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Chọn Trace:</label>
          <select
            value={selectedTraceId || ''}
            onChange={(e) => setSelectedTraceId(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              background: '#101524',
              color: '#f8fafc',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              fontFamily: 'Fira Code, monospace',
              cursor: 'pointer'
            }}
          >
            {recentOrders.map((ord) => (
              <option key={ord.orderId} value={ord.traceId}>
                {ord.orderId} | {ord.status} | {ord.durationMs}ms | Trace: {ord.traceId.substring(0, 10)}...
              </option>
            ))}
          </select>

          {activeOrder && (
            <a
              href={`http://localhost:16686/trace/${activeOrder.traceId}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.85rem',
                color: '#60c5ea',
                textDecoration: 'underline',
                fontFamily: 'Fira Code, monospace',
                marginLeft: 'auto'
              }}
            >
              Trace ID: {activeOrder.traceId} (Xem trên Jaeger ↗)
            </a>
          )}
        </div>
      </div>

      {/* Waterfall Visualization */}
      {activeOrder && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>Chi Tiết Tiến Trình Span (Trace Waterfall)</span>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tổng thời gian: <strong style={{ color: '#f8fafc' }}>{activeOrder.durationMs}ms</strong>
              </span>
            </div>
            <span className={activeOrder.status === 'COMPLETED' ? 'badge badge-2xx' : 'badge badge-5xx'}>
              {activeOrder.status}
            </span>
          </div>

          {/* Timeline Bar Ruler */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', fontFamily: 'Fira Code' }}>
            <span>0ms</span>
            <span>{(maxDuration * 0.25).toFixed(0)}ms</span>
            <span>{(maxDuration * 0.5).toFixed(0)}ms</span>
            <span>{(maxDuration * 0.75).toFixed(0)}ms</span>
            <span>{maxDuration.toFixed(0)}ms</span>
          </div>

          {/* Spans List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Root Span */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🌐</span> [Root Span] order.process_checkout
                </span>
                <span className="font-mono" style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{activeOrder.durationMs}ms</span>
              </div>
              <div style={{ width: '100%', height: '14px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: activeOrder.status === 'COMPLETED' ? 'linear-gradient(90deg, #60c5ea, #818cf8)' : 'linear-gradient(90deg, #f87171, #ef4444)',
                  borderRadius: '4px'
                }} />
              </div>
            </div>

            {/* Child Spans */}
            {activeOrder.spansTimeline && activeOrder.spansTimeline.map((span, idx) => {
              const leftPercent = (span.offsetMs / maxDuration) * 100;
              const widthPercent = Math.max((span.durationMs / maxDuration) * 100, 3);
              const isError = span.status === 'ERROR' || (activeOrder.status === 'FAILED' && idx === activeOrder.spansTimeline.length - 1);

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>↳</span>
                      <span style={{ color: isError ? '#f87171' : '#cbd5e1', fontWeight: 500 }}>{span.name}</span>
                      {isError && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>(Exception Caught!)</span>}
                    </span>
                    <span className="font-mono" style={{ color: isError ? '#f87171' : 'var(--text-dim)', fontSize: '0.75rem' }}>
                      +{span.offsetMs}ms | {span.durationMs}ms
                    </span>
                  </div>

                  <div style={{ position: 'relative', width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '3px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        height: '100%',
                        background: isError ? '#ef4444' : '#38bdf8',
                        borderRadius: '3px',
                        boxShadow: isError ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chi tiết lỗi nếu có */}
          {activeOrder.error && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
              <strong>Lỗi ghi nhận trong Span:</strong> {activeOrder.error}
            </div>
          )}
        </div>
      )}

      {/* Kiến thức Tracing */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>💡 Nguyên Lý Cốt Lõi: W3C TraceContext Propagation</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>
          Khi một request đi qua nhiều microservices, OpenTelemetry tự động tiêm (inject) HTTP Header tiêu chuẩn:
          <br />
          <code className="font-mono" style={{ background: '#101524', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#60c5ea', display: 'inline-block', margin: '0.4rem 0' }}>
            traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
          </code>
          <br />
          Trong đó: <strong style={{ color: '#fff' }}>00</strong> là version, <strong style={{ color: '#38bdf8' }}>4bf92f35...</strong> là Trace ID (duy nhất toàn cầu xuyên suốt mọi service), <strong style={{ color: '#a78bfa' }}>00f067aa...</strong> là Parent Span ID, và <strong style={{ color: '#34d399' }}>01</strong> là Sampled Flag (được Jaeger chọn lưu trữ).
        </p>
      </div>
    </div>
  );
}
