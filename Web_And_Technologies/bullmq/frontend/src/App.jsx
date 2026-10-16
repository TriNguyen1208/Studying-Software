import React, { useState, useEffect } from 'react';
import { 
  Layers, Play, CheckCircle2, AlertTriangle, RefreshCw, 
  Flame, Clock, Cpu, Server, Activity, ArrowRight, Zap
} from 'lucide-react';

export default function App() {
  const [counts, setCounts] = useState({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
  const [jobs, setJobs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll trạng thái hàng đợi mỗi 800ms
  const pollQueue = async () => {
    try {
      const [resStats, resRecent] = await Promise.all([
        fetch('/api/jobs/stats'),
        fetch('/api/jobs/recent')
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setCounts(statsData.counts);
      }

      if (resRecent.ok) {
        const recentData = await resRecent.json();
        setJobs(recentData.jobs);
      }
    } catch (err) {
      console.warn('Poll error:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(pollQueue, 800);
    pollQueue();
    return () => clearInterval(timer);
  }, []);

  const createJob = async (type, priority = 0, shouldFail = false) => {
    setIsSubmitting(true);
    try {
      await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, priority, shouldFail })
      });
      pollQueue();
    } catch (err) {
      console.error('Create job error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* HEADER */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ff007a, #7928ca)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(255, 0, 122, 0.4)' }}>
              <Layers size={28} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 40%, #ff007a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                BullMQ Distributed Job Queue Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Redis-backed Asynchronous Processing, Atomic Lua Scripts, Worker Concurrency & Auto-Retry
              </p>
            </div>
          </div>

          <span className="badge badge-pink">
            Worker Fleet Active (Concurrency: 3)
          </span>
        </div>

        {/* METRICS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ĐANG CHỜ (WAITING)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffd740' }}>{counts.waiting}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ĐANG XỬ LÝ (ACTIVE)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{counts.active}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>HOÀN TẤT (COMPLETED)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00e676' }}>{counts.completed}</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>THẤT BẠI (FAILED / DLQ)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff5252' }}>{counts.failed}</div>
          </div>
        </div>
      </header>

      {/* DISPATCH ACTIONS */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play size={18} color="var(--bull-pink)" />
          Điều Phối Công Việc Nặng (Dispatch Background Jobs)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Đẩy các tác vụ tốn CPU hoặc I/O vào Redis. API phản hồi ngay lập tức trong 2ms mà không bắt người dùng chờ!
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => createJob('video_transcode', 0, false)}
            disabled={isSubmitting}
            className="btn-primary"
          >
            <Zap size={16} />
            1. Tạo Job Nén Video 4K (Xử lý 3.5s)
          </button>

          <button
            onClick={() => createJob('vip_export', 1, false)}
            disabled={isSubmitting}
            className="btn-secondary"
            style={{ color: '#ffd740', borderColor: 'rgba(255,215,64,0.3)' }}
          >
            <Flame size={16} />
            2. Tạo Job Xuất Báo Cáo VIP (Priority: 1)
          </button>

          <button
            onClick={() => createJob('faulty_task', 0, true)}
            disabled={isSubmitting}
            className="btn-secondary"
            style={{ color: '#ff5252', borderColor: 'rgba(255,23,68,0.3)' }}
          >
            <AlertTriangle size={16} />
            3. Tạo Job Cố Tình Gặp Lỗi (Test Auto-Retry & DLQ)
          </button>
        </div>
      </div>

      {/* RECENT JOBS TABLE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--bull-pink)" />
          Trạng Thái Các Jobs Trong Hàng Đợi (Queue State Stream)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Job ID</th>
                <th style={{ padding: '10px 12px' }}>Tên Tác Vụ</th>
                <th style={{ padding: '10px 12px' }}>Trạng Thái</th>
                <th style={{ padding: '10px 12px' }}>Tiến Độ (Progress)</th>
                <th style={{ padding: '10px 12px' }}>Số Lần Thử</th>
                <th style={{ padding: '10px 12px' }}>Kết Quả / Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Hàng đợi đang rảnh rỗi. Nhấn nút "Tạo Job" bên trên để bắt đầu quan sát!
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--bull-pink)' }}>#{job.id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{job.name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={job.state === 'completed' ? 'badge badge-green' : job.state === 'active' ? 'badge badge-blue' : job.state === 'failed' ? 'badge badge-red' : 'badge badge-amber'}>
                        {job.state}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '140px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${job.progress}%`, background: 'linear-gradient(90deg, #ff007a, #00e5ff)', transition: 'width 0.3s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{job.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{job.attemptsMade}</td>
                    <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: job.failedReason ? '#ff5252' : 'var(--text-muted)' }}>
                      {job.failedReason || job.returnValue?.resultMessage || 'Đang thực thi trong background...'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
