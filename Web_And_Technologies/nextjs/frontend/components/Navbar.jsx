'use client';

/**
 * components/Navbar.jsx - Thanh điều hướng chính (Client Component)
 * Lý do dùng 'use client': Cần đọc totalCount từ useCart() và lắng nghe tương tác click của người dùng.
 */

import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Sparkles, Activity, BookOpen } from 'lucide-react';

export default function Navbar() {
  const { totalCount } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              N
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg group-hover:text-sky-600 transition-colors">
                TechStore <span className="text-sky-600 font-normal">Pro</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-sky-700 bg-sky-100 rounded-full border border-sky-200">
                Next.js + Node.js
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium text-slate-600">
          <Link 
            href="/" 
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Sản Phẩm
          </Link>

          <Link 
            href="/admin" 
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Admin Live (SSE)</span>
          </Link>

          {/* Nút Giỏ hàng */}
          <Link
            href="/checkout"
            className="relative flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all hover:scale-105"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Giỏ hàng</span>
            {totalCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-sky-500 text-white rounded-full animate-bounce">
                {totalCount}
              </span>
            )}
          </Link>
        </nav>

      </div>
    </header>
  );
}
