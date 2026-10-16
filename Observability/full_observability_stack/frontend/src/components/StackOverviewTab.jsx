import React from 'react';

export default function StackOverviewTab() {
  const services = [
    {
      name: 'Grafana',
      port: 3000,
      url: 'http://localhost:3000',
      role: 'Visualization & Dashboarding',
      desc: 'Bảng điều khiển tập trung hợp nhất cả 3 trụ cột (Metrics, Logs, Traces). Đã cấu hình sẵn Datasource & Dashboard!',
      color: 'var(--color-grafana)',
      badge: 'Admin Access: admin/admin',
      icon: '📊'
    },
    {
      name: 'Prometheus',
      port: 9090,
      url: 'http://localhost:9090',
      role: 'Metrics TSDB & Alerting',
      desc: 'Công cụ cào (PULL) định kỳ số liệu Time-Series từ /metrics, lưu trữ với thuật toán nén Gorilla và chạy truy vấn PromQL.',
      color: 'var(--color-prometheus)',
      badge: 'Scrape Target: 3s',
      icon: '🔥'
    },
    {
      name: 'Loki',
      port: 3100,
      url: 'http://localhost:3100/ready',
      role: 'Log Aggregation Engine',
      desc: 'Hệ thống gom log chỉ đánh index các nhãn (Labels). Không đánh index nội dung giúp tiết kiệm tối đa RAM và ổ cứng.',
      color: 'var(--color-loki)',
      badge: 'LogQL Engine',
      icon: '📜'
    },
    {
      name: 'Jaeger',
      port: 16686,
      url: 'http://localhost:16686',
      role: 'Distributed Tracing (OTLP)',
      desc: 'Ghi nhận toàn bộ hành trình phân tán của request qua Spans, đo lường độ trễ từng vi dịch vụ và trực quan hóa Waterfall.',
      color: 'var(--color-jaeger)',
      badge: 'OTLP Receiver 4318',
      icon: '⚡'
    },
    {
      name: 'Backend API',
      port: 5001,
      url: 'http://localhost:5001/metrics',
      role: 'Instrumented Application',
      desc: 'Express Server tích hợp OpenTelemetry SDK (OTLP Exporter), prom-client và Winston structured logging.',
      color: '#818cf8',
      badge: 'NodeJS 20 + OTel',
      icon: '⚙️'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner Giới Thiệu */}
      <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16,21,36,0.9), rgba(26,35,56,0.7))' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Kiến Trúc Bộ Tứ Quan Sát Toàn Diện (Full Observability Stack)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          Observability (Khả năng quan sát) không chỉ là việc vẽ vài biểu đồ đơn giản. Đó là khả năng suy luận trạng thái nội tại của hệ thống phân tán dựa trên dữ liệu đầu ra: <strong style={{ color: '#38bdf8' }}>Metrics (Cái gì đang xảy ra?)</strong>, <strong style={{ color: '#e59700' }}>Logs (Tại sao nó xảy ra?)</strong>, và <strong style={{ color: '#60c5ea' }}>Traces (Nó xảy ra ở đâu và mất bao lâu?)</strong>.
        </p>
      </div>

      {/* Quick Launchpad Cards */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🚀</span> Cổng Dịch Vụ Mở Nhanh (Service Launchpad)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {services.map((srv) => (
            <div
              key={srv.name}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderTop: `3px solid ${srv.color}`
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{srv.icon}</span>
                  <span className="font-mono" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: srv.color }}>
                    Port :{srv.port}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  {srv.name}
                </h4>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: srv.color, marginBottom: '0.5rem' }}>
                  {srv.role}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                  {srv.desc}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{srv.badge}</span>
                <a
                  href={srv.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: srv.color,
                    textDecoration: 'none'
                  }}
                >
                  <span>Mở ngay</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Trụ Cột Observability So Sánh Bản Chất */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚖️</span> So Sánh Bản Chất: 3 Trụ Cột Observability
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Trụ Cột</th>
                <th style={{ padding: '0.75rem' }}>Công Cụ</th>
                <th style={{ padding: '0.75rem' }}>Bản Chất Dữ Liệu</th>
                <th style={{ padding: '0.75rem' }}>Câu Hỏi Trả Lời</th>
                <th style={{ padding: '0.75rem' }}>Chi Phí Lưu Trữ / Cardinality</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-prometheus)' }}>Metrics</td>
                <td style={{ padding: '0.75rem' }}>Prometheus</td>
                <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Số liệu thống kê Time-Series tổng hợp (Counter, Gauge, Histogram)</td>
                <td style={{ padding: '0.75rem', color: '#f8fafc' }}>Có sự cố xảy ra không? Tốc độ bao nhiêu? Tỷ lệ lỗi?</td>
                <td style={{ padding: '0.75rem', color: '#34d399' }}>Rất rẻ (Gorilla compression 1-2 bytes / sample)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-loki)' }}>Logs</td>
                <td style={{ padding: '0.75rem' }}>Grafana Loki</td>
                <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Dòng sự kiện văn bản có cấu trúc JSON kèm Timestamp và Labels</td>
                <td style={{ padding: '0.75rem', color: '#f8fafc' }}>Tại sao sự cố xảy ra? Nguyên nhân lỗi cụ thể là gì?</td>
                <td style={{ padding: '0.75rem', color: '#fbbf24' }}>Trung bình (Chỉ index labels, nén chunk lên Cloud Storage)</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--color-jaeger)' }}>Traces</td>
                <td style={{ padding: '0.75rem' }}>Jaeger (OTel)</td>
                <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Cây đồ thị có hướng (DAG) các Spans gắn liền với Trace ID</td>
                <td style={{ padding: '0.75rem', color: '#f8fafc' }}>Sự cố xảy ra ở đâu? Service nào bị nghẽn (Bottleneck)?</td>
                <td style={{ padding: '0.75rem', color: '#f87171' }}>Cao nhất (Cần chiến lược Sampling như 5-10% ở production)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
