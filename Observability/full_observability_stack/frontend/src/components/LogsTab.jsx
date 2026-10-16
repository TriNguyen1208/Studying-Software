import React, { useState, useEffect } from 'react';

export default function LogsTab({ apiBase, selectedTraceId, setSelectedTraceId, onSwitchToTraceTab }) {
  const [logs, setLogs] = useState([]);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${apiBase}/api/observability/stats`);
      const data = await res.json();
      if (data.success && data.data.recentLogs) {
        setLogs(data.data.recentLogs);
      }
    } catch (_err) {}
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Lọc theo level và search term
  const filteredLogs = logs.filter((log) => {
    const matchLevel = levelFilter === 'ALL' || log.level?.toLowerCase() === levelFilter.toLowerCase();
    const matchSearch =
      !searchTerm ||
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.trace_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase());
    return matchLevel && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Direct Grafana Link */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-loki)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--color-loki)' }}>📜</span> Grafana Loki Structured Log Stream
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Loki lấy cảm hứng từ Prometheus: Chỉ đánh chỉ mục (Index) <strong>Metadata Labels</strong>, không đánh chỉ mục Full-Text nội dung log, giúp tiết kiệm 80-90% dung lượng RAM và đĩa!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a
              href="http://localhost:3000/explore?schemaVersion=1&panes=%7B%22v8g%22:%7B%22datasource%22:%22loki%22,%22queries%22:%5B%7B%22refId%22:%22A%22,%22expr%22:%22%7Bservice_name%3D%5C%22order-payment-service%5C%22%7D%22%7D%5D%7D%7D"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: 'rgba(229, 151, 0, 0.15)',
                color: '#e59700',
                border: '1px solid rgba(229, 151, 0, 0.4)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              <span>Mở Loki Explore trong Grafana</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Bộ lọc Logs */}
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Level Filter */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: levelFilter === lvl ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                  color: levelFilter === lvl ? '#0a0d14' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm từ khóa, Trace ID, HTTP route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                background: '#101524',
                color: '#f8fafc',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      </div>

      {/* LogQL Query Bar */}
      <div style={{ background: '#070a10', padding: '0.85rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#e59700', fontWeight: 600, fontSize: '0.8rem' }}>LogQL Cú Pháp:</span>
        <code className="font-mono" style={{ color: '#a5b4fc', fontSize: '0.85rem' }}>
          {'{service_name="order-payment-service"}'}
          {levelFilter !== 'ALL' ? ` | json | level="${levelFilter.toLowerCase()}"` : ''}
          {searchTerm ? ` |= "${searchTerm}"` : ''}
        </code>
      </div>

      {/* Live Log Stream Table */}
      <div className="glass-panel" style={{ padding: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            Không có dòng log nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredLogs.map((item, idx) => {
              const isErr = item.level?.toLowerCase() === 'error';
              const isWarn = item.level?.toLowerCase() === 'warn';
              const levelColor = isErr ? '#ef4444' : isWarn ? '#f59e0b' : '#38bdf8';

              return (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    background: isErr ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    borderLeft: `3px solid ${levelColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontSize: '0.825rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() + '.' + new Date(item.timestamp).getMilliseconds() : ''}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: `${levelColor}22`,
                          color: levelColor,
                          border: `1px solid ${levelColor}44`,
                          fontSize: '0.7rem'
                        }}
                      >
                        {item.level || 'INFO'}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>[{item.service_name}]</span>
                    </div>

                    {item.trace_id && (
                      <button
                        onClick={() => {
                          setSelectedTraceId(item.trace_id);
                          if (onSwitchToTraceTab) onSwitchToTraceTab();
                        }}
                        className="font-mono"
                        style={{
                          background: 'rgba(96, 197, 234, 0.1)',
                          border: '1px solid rgba(96, 197, 234, 0.3)',
                          borderRadius: '4px',
                          color: '#60c5ea',
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Bấm để xem Trace Waterfall tương ứng"
                      >
                        <span>🔗 trace:</span>
                        <span>{item.trace_id.substring(0, 10)}...</span>
                      </button>
                    )}
                  </div>

                  <div style={{ color: isErr ? '#fca5a5' : '#f1f5f9', fontWeight: isErr ? 600 : 400, wordBreak: 'break-word', lineHeight: '1.4' }}>
                    {item.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
