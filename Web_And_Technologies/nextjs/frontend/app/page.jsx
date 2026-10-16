/**
 * app/page.jsx - Trang Chủ Sản Phẩm (Async React Server Component)
 * 
 * 💡 BẢN CHẤT LÕI CỦA ASYNC SERVER COMPONENT:
 * - Đây là hàm ASYNC chạy 100% trên Node.js Server của Next.js.
 * - Ta có thể dùng `await fetchAllProducts()` trực tiếp bên trong component mà KHÔNG CẦN:
 *   + Không cần useEffect()
 *   + Không cần useState()
 *   + Không cần thư viện ngoài như axios hay tanstack-query
 * - Next.js render HTML tĩnh + RSC Payload trên máy chủ rồi gửi về. Trình duyệt nhận được HTML hoàn chỉnh,
 *   SEO tối ưu tuyệt đối và điểm First Contentful Paint (FCP) cực thấp!
 */
import { fetchAllProducts } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { Sparkles, Server, Zap, RefreshCw, Cpu, Layers } from 'lucide-react';
import Link from 'next/link';

// Cấu hình Revalidation thời gian ISR (Incremental Static Regeneration)
export const revalidate = 30; // Tự động làm mới cache sau mỗi 30 giây

export default async function HomePage() {
  // Lời gọi fetch dữ liệu trực tiếp tại Server
  const products = await fetchAllProducts();

  return (
    <div className="space-y-12">
      
      {/* Hero Section: Giới thiệu Kiến trúc Next.js */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next.js 14 App Router + Node.js Backend Enterprise</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Hiệu Năng Vượt Trội Với <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">React Server Components</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Hệ thống minh họa trực quan cách Next.js kết hợp <strong>Server-Side Rendering (SSR)</strong>, 
            <strong> Incremental Static Regeneration (ISR)</strong> và <strong>Node.js API</strong> độc lập để đạt tốc độ tải trang mili-giây và SEO hoàn hảo.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href="#products-section"
              className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/30 transition-all hover:scale-105 text-sm"
            >
              Khám Phá Sản Phẩm (RSC)
            </a>
            <Link
              href="/admin"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-sky-400" />
              <span>Admin Live Stream (SSE)</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Grid 4 Trụ Cột Kiến Trúc Next.js */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4" id="architecture">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Server Components (RSC)</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Render trực tiếp trên server, không tải mã thư viện về browser. Giảm tải bundle JS xuống mức tối thiểu.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Streaming & Suspense</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Truyền dữ liệu dạng HTTP chunked streams. Khung trang hiển thị tức thì, phần dữ liệu chậm tải tiếp sau.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-3">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Incremental Static (ISR)</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Trang được render tĩnh sẵn trên cache. Tự động chạy lại ngầm sau mỗi 30s để cập nhật giá và tồn kho.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Server Actions Mutation</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Gọi logic mutation server trực tiếp từ client form mà không cần viết boilerplate API endpoints thủ công.
          </p>
        </div>
      </section>

      {/* Catalog Sản Phẩm (Rendered hoàn toàn qua RSC) */}
      <section id="products-section" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900">Danh Mục Sản Phẩm Công Nghệ</h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% Server Rendered
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dữ liệu được nạp trực tiếp từ Node.js API (<code>http://localhost:5001/api/products</code>) với cơ chế ISR 30 giây.
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg font-mono">
            Next.js Cache: HIT (revalidate: 30s)
          </div>
        </div>

        {/* Danh sách Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

    </div>
  );
}
