/**
 * components/ProductCard.jsx - Thẻ hiển thị Sản Phẩm (React Server Component)
 * 
 * 💡 KIẾN THỨC CỐT LÕI VỀ RSC INTERLEAVING:
 * - File này KHÔNG CÓ directive 'use client'. Do đó nó là một React Server Component 100%.
 * - Toàn bộ mã JSX, tính toán giảm giá, render thông số specs đều chạy ở Node.js Server.
 * - Nó lồng (embed) Client Component <AddToCartButton /> vào bên trong.
 * - Next.js tự động chuyển đổi thành thẻ HTML tĩnh và tạo ra placeholder cho client hydration!
 */

import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import { Star, Cpu, ShieldCheck } from 'lucide-react';

export default function ProductCard({ product }) {
  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Hình ảnh sản phẩm */}
        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-white/90 backdrop-blur-md text-slate-800 shadow-sm">
              {product.category}
            </span>
            {discountPercent > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500 text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[11px] rounded-lg font-medium flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{product.rating}</span>
          </div>
        </div>

        {/* Nội dung thông tin */}
        <div className="p-5">
          <Link href={`/products/${product.id}`} className="block">
            <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>

          <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Quick specs preview */}
          {product.specs && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
              {Object.entries(product.specs).slice(0, 2).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1 truncate" title={`${key}: ${val}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <span className="truncate">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Giá tiền & Nút giỏ hàng (Client Component lá) */}
      <div className="p-5 pt-0 mt-auto">
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-slate-400 line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
          <span className={`text-[11px] font-semibold ${product.stock < 10 ? 'text-amber-600' : 'text-slate-500'}`}>
            Kho: {product.stock}
          </span>
        </div>

        {/* Nhúng Client Component vào Server Component */}
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
