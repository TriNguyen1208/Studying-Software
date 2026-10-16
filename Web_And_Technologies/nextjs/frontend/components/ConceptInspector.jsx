'use client';

/**
 * ConceptInspector.jsx - Trình soi chiếu Kiến trúc Next.js (Concept Inspector)
 * 
 * Mục đích:
 * Hiển thị một floating badge trực quan giúp người học nhận biết ngay lập tức:
 * - Khối giao diện nào là React Server Component (RSC - render 100% tại server, không tải JS về browser)
 * - Khối giao diện nào là Client Component (có directive 'use client', được hydrate bởi React Fiber)
 * - Giám sát hiệu năng truyền tải Payload
 */

import { useState } from 'react';
import { Layers, Server, Monitor, ShieldCheck, Zap } from 'lucide-react';

export default function ConceptInspector() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl border border-slate-700 transition-all transform hover:scale-105"
        >
          <Layers className="w-5 h-5 text-sky-400 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide">Next.js Concept Inspector</span>
        </button>
      ) : (
        <div className="w-96 glass-panel rounded-2xl p-5 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-base">Next.js Architecture Lens</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            {/* Server Component Badge */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <Server className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-800 text-sm block">React Server Component (RSC)</span>
                <p className="text-emerald-700 mt-1">
                  Mặc định trong App Router. Mã nguồn fetch DB trực tiếp trên Server và tạo ra HTML + RSC Payload. 
                  <strong className="block mt-0.5 text-emerald-900">0 Byte JS bundle gửi xuống Browser!</strong>
                </p>
              </div>
            </div>

            {/* Client Component Badge */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-3">
              <Monitor className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sky-800 text-sm block">Client Component ('use client')</span>
                <p className="text-sky-700 mt-1">
                  Chỉ dùng ở lá cây (leaves) nơi cần tương tác (onClick, useState, useEffect).
                  Được SSR tạo khung HTML trước, sau đó React Fiber tiến hành <strong>Hydration</strong> tại client.
                </p>
              </div>
            </div>

            {/* Streaming Suspense Badge */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-800 text-sm block">HTTP Streaming & Suspense</span>
                <p className="text-amber-700 mt-1">
                  Trang không bị chặn (non-blocking). Dữ liệu nhanh stream về trước, dữ liệu chậm (như Reviews) stream về sau dạng các chunk HTML.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 text-center text-slate-500 text-[11px]">
            Hệ thống đang đồng bộ với Node.js Backend tại <code className="text-sky-600 font-mono">localhost:5001</code>
          </div>
        </div>
      )}
    </div>
  );
}
