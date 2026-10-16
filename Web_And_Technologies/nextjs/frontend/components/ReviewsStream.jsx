/**
 * components/ReviewsStream.jsx - Trình diễn React Streaming & Suspense
 * 
 * 💡 BẢN CHẤT LÕI HTTP STREAMING TRONG NEXT.JS:
 * - Next.js sử dụng Transfer-Encoding: chunked qua HTTP/1.1 hoặc HTTP/2 stream.
 * - Thành phần ReviewsStream này gọi API backend mất 1.5 giây.
 * - Thay vì bắt toàn bộ trang chờ 1.5s (làm hỏng TTFB và FCP), Next.js gửi trước phần khung (Layout, Thông tin sản phẩm, Ảnh)
 *   cùng với fallback Skeleton.
 * - Khi backend Node.js trả về dữ liệu reviews, Next.js tiếp tục stream khối HTML của Reviews kèm đoạn mã JavaScript
 *   siêu nhỏ để tự động hoán đổi (swap) placeholder thành nội dung thật trong DOM của trình duyệt!
 */

import { fetchProductReviews } from '../lib/api';
import { Star, MessageSquareQuote, CheckCircle2 } from 'lucide-react';

export async function ReviewsStream({ productId }) {
  // Lời gọi bất đồng bộ bị trễ 1.5s trên Node.js backend
  const reviews = await fetchProductReviews(productId);

  if (!reviews || reviews.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-sm">
        Chưa có đánh giá nào cho sản phẩm này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          ⚡ HTTP Chunked Streamed
        </span>
        <span className="text-xs text-slate-400">Được stream từ Node.js backend sau 1.5s</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reviews.map((rev) => (
          <div key={rev.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center">
                  {rev.user.charAt(0)}
                </div>
                <span className="text-xs font-semibold text-slate-800">{rev.user}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <div className="flex">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{rev.comment}"
            </p>
            <span className="block mt-2 text-[10px] text-slate-400">{rev.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton hiển thị trong lúc luồng đang stream dữ liệu
export function ReviewsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 bg-slate-100 rounded-2xl h-28 border border-slate-200"></div>
        <div className="p-4 bg-slate-100 rounded-2xl h-28 border border-slate-200"></div>
      </div>
    </div>
  );
}
