import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Terminal, Trash2 } from 'lucide-react';

export default function LiveEventStream({ logs, onClear }) {
  const [expandedId, setExpandedId] = useState(null);

  const getEventBadge = (event) => {
    switch (event) {
      case 'ORDER_PUBLISHED':
        return <span className="badge badge-indigo">PUBLISHED</span>;
      case 'PROCESSING_STARTED':
        return <span className="badge badge-indigo">PROCESSING</span>;
      case 'PROCESSING_SUCCESS':
        return <span className="badge badge-emerald">SUCCESS (ACK)</span>;
      case 'MESSAGE_SENT_TO_RETRY':
        return <span className="badge badge-amber">DELAYED RETRY (TTL)</span>;
      case 'MAX_RETRIES_EXCEEDED':
        return <span className="badge badge-rose">RETRIES EXHAUSTED</span>;
      case 'POISON_PILL_DETECTED':
        return <span className="badge badge-rose">POISON PILL (NACK)</span>;
      case 'DEAD_LETTER_CAPTURED':
        return <span className="badge badge-rose animate-pulse">DLQ CAPTURED</span>;
      case 'DLQ_MESSAGE_REDRIVEN':
        return <span className="badge badge-emerald">REDRIVEN</span>;
      case 'DLQ_MESSAGE_DISCARDED':
        return <span className="badge badge-amber">DISCARDED</span>;
      default:
        return <span className="badge badge-indigo">{event}</span>;
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Live Event Stream & Audit Logs (SSE)</h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-outline text-xs !py-1 !px-2.5 text-slate-400"
            title="Xóa danh sách logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa Logs
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 font-mono">
          Đang chờ sự kiện từ hệ thống AMQP...
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const time = new Date(log.timestamp).toLocaleTimeString();

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors text-xs"
              >
                <div
                  className="flex items-center justify-between gap-2 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-slate-500 font-mono text-[11px] shrink-0">{time}</span>
                    {getEventBadge(log.event)}
                    <span className="text-slate-300 font-medium truncate">
                      {log.data?.message || JSON.stringify(log.data)}
                    </span>
                  </div>

                  <button className="text-slate-500 hover:text-white shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">
                      Event Metadata & Payload:
                    </div>
                    <pre className="p-2 rounded bg-black/60 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
