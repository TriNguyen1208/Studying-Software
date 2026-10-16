/**
 * app/products/[id]/page.jsx - Trang Chi Tiết Sản Phẩm (Dynamic Route + ISR + React Streaming Suspense)
 * 
 * 💡 BẢN CHẤT LÕI:
 * 1. generateStaticParams(): Tự động pre-render các trang sản phẩm này tại thời điểm Build (SSG).
 * 2. revalidate = 30: Cho phép tự động cập nhật lại HTML sau 30 giây khi có request mới (ISR).
 * 3. React <Suspense>:
 *    - Toàn bộ thông tin sản phẩm, hình ảnh, thông số kỹ thuật được render và gửi về trình duyệt ngay lập tức.
 *    - Khối <ReviewsStream /> gọi backend mất 1.5s được bao bọc trong <Suspense fallback={<ReviewsSkeleton />}>.
 *    - Next.js sẽ KHÔNG CHỜ khối reviews này! Nó stream HTML trang về trước, và tiếp tục stream khối reviews sau khi hoàn thành.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchAllProducts, fetchProductById } from '../../../lib/api';
import { ReviewsStream, ReviewsSkeleton } from '../../../components/ReviewsStream';
import AddToCartButton from '../../../components/AddToCartButton';
import { ArrowLeft, Star, ShieldCheck, Truck, RefreshCw, Cpu, Layers } from 'lucide-react';

export const revalidate = 30; // ISR sau mỗi 30 giây

// Pre-render các trang tĩnh tại thời điểm Build
export async function generateStaticParams() {
  const products = await fetchAllProducts();
  return products.map((p) => ({
    id: p.id,
  }));
}

export default async function ProductDetailPage({ params }) {
  const product = await fetchProductById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-8">
      
      {/* Nút quay lại */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Catalog</span>
      </Link>

      {/* Main Product Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
        
        {/* Cột Trái: Ảnh Sản Phẩm */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-video lg:aspect-square">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-900/80 backdrop-blur-md text-white">
                {product.category}
              </span>
            </div>
          </div>
        </div>

        {/* Cột Phải: Thông tin chi tiết & Mua hàng */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating} / 5.0</span>
              </div>
              <span className="text-xs text-slate-400">• Đánh giá từ chuyên gia</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {product.name}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              {product.description}
            </p>

            {/* Thông số kỹ thuật */}
            {product.specs && (
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  <span>Thông Số Kỹ Thuật (Specs)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-slate-400 uppercase text-[10px] font-semibold">{key}</span>
                      <span className="font-semibold text-slate-700">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Box: Giá & Đặt mua */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900">${product.price}</span>
                {product.originalPrice && (
                  <span className="ml-2 text-sm text-slate-400 line-through">${product.originalPrice}</span>
                )}
              </div>
              <span className={`text-xs font-bold ${product.stock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {product.stock > 0 ? `Còn hàng trong kho: ${product.stock}` : 'Đã tạm hết'}
              </span>
            </div>

            <AddToCartButton product={product} />

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-600" />
                <span>Giao hỏa tốc 24h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bảo hành chính hãng 24T</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Phần Đánh Giá: Minh họa React Streaming Suspense (Bị delay 1.5s từ Node.js API) */}
      <section className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-black text-slate-900">Đánh Giá Thực Tế Từ Người Dùng</h3>
          <p className="text-xs text-slate-500 mt-1">
            Khu vực này minh họa <strong>React 18/19 Streaming with Suspense</strong>. 
            Dữ liệu reviews được Node.js backend cố tình làm trễ 1.5s, nhưng giao diện sản phẩm phía trên vẫn mở ra ngay lập tức!
          </p>
        </div>

        {/* Khối Suspense bao bọc thành phần Stream */}
        <Suspense fallback={<ReviewsSkeleton />}>
          <ReviewsStream productId={product.id} />
        </Suspense>
      </section>

    </div>
  );
}
