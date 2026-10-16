/**
 * app/layout.jsx - Root Layout (React Server Component)
 * 
 * 💡 BẢN CHẤT LÕI:
 * - Trong App Router, Root Layout bọc toàn bộ ứng dụng và chạy 100% trên Server.
 * - Được render một lần duy nhất, không bị re-render khi người dùng chuyển trang (Preserves State across route transitions).
 * - Cung cấp metadata chuẩn SEO toàn cầu.
 */
import './globals.css';
import Navbar from '../components/Navbar';
import ConceptInspector from '../components/ConceptInspector';
import { CartProvider } from '../context/CartContext';

export const metadata = {
  title: 'TechStore Pro - Next.js 14 App Router & Node.js Production Architecture',
  description: 'Hệ thống demo Full-Stack chuyên sâu Next.js App Router, React Server Components (RSC), Streaming Suspense, ISR và Node.js Backend API.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <CartProvider>
          {/* Header thanh điều hướng */}
          <Navbar />

          {/* Nội dung chính của từng trang */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Floating Concept Inspector */}
          <ConceptInspector />

          {/* Footer chuẩn enterprise */}
          <footer className="border-t border-slate-200 bg-white/70 py-8 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-800">TechStore Pro Architecture</span> — Next.js 14 (RSC + ISR) & Node.js Express API
              </div>
              <div className="flex items-center gap-4">
                <a href="#architecture" className="hover:text-sky-600 transition-colors">Kiến Trúc</a>
                <a href="/admin" className="hover:text-sky-600 transition-colors">Admin SSE</a>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                  Node.js API Connected
                </span>
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
