'use client';

/**
 * app/checkout/page.jsx - Trang Thanh Toán & Thực Thi Server Actions
 * 
 * 💡 BẢN CHẤT LÕI SERVER ACTION:
 * - Khi người dùng bấm "Xác Nhận Đặt Hàng", form gọi trực tiếp hàm `submitOrderAction`
 *   được import từ file 'app/actions/order.js'.
 * - Hàm này chạy hoàn toàn trên Next.js Server, chuyển tiếp request sang Node.js Backend API,
 *   trừ tồn kho và gọi `revalidateTag('products')` để hủy cache cũ.
 * - Trình duyệt không cần phải viết fetch handler hay API endpoint thủ công!
 */

import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { submitOrderAction } from '../actions/order';
import { ShoppingBag, ArrowRight, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { items, removeFromCart, clearCart, totalAmount } = useCart();
  
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setOrderResult(null);

    try {
      // Gọi trực tiếp Next.js Server Action
      const result = await submitOrderAction({
        customerName,
        email,
        items: items.map(i => ({ productId: i.id, quantity: i.quantity, name: i.name })),
        totalAmount
      });

      if (result.success) {
        setOrderResult(result);
        clearCart();
      } else {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi không xác định khi thực hiện Server Action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Thanh Toán & Xử Lý Đơn Hàng</h1>
        <p className="text-xs text-slate-500 mt-1">
          Trang minh họa <strong>Next.js Server Actions</strong> gửi đơn sang <strong>Node.js Backend</strong> và tự động revalidate cache.
        </p>
      </div>

      {/* Thông báo kết quả sau khi gọi Server Action */}
      {orderResult && (
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-extrabold text-lg text-emerald-900">Đặt Hàng Thành Công Qua Server Action!</h3>
              <p className="text-xs text-emerald-700 mt-0.5">{orderResult.message}</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-xs space-y-1 font-mono">
            <div><strong>Mã Đơn Hàng:</strong> {orderResult.order.id}</div>
            <div><strong>Khách Hàng:</strong> {orderResult.order.customerName} ({orderResult.order.email})</div>
            <div><strong>Tổng Tiền:</strong> ${orderResult.order.totalAmount}</div>
            <div><strong>Trạng Thái:</strong> {orderResult.order.status}</div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/admin"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Mở Admin Dashboard Xem Live SSE →
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-white text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              Tiếp tục mua hàng
            </Link>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Cột Trái: Danh sách sản phẩm trong giỏ */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-sky-600" />
              <span>Sản Phẩm Trong Giỏ ({items.length})</span>
            </h3>

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Giỏ hàng của bạn đang trống. Hãy quay lại trang Catalog để thêm sản phẩm!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="pt-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                        <span className="text-[11px] text-slate-400">Số lượng: {item.quantity} × ${item.price}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-slate-900">${item.price * item.quantity}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Form thông tin & Nút bấm Server Action */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900">Thông Tin Khách Hàng</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ Và Tên</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Nhận Hóa Đơn</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-500">Tổng thanh toán:</span>
                <span className="text-2xl font-black text-slate-900">${totalAmount}</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all hover:scale-102"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang thực thi Server Action...</span>
                  </>
                ) : (
                  <>
                    <span>Xác Nhận Đặt Hàng (Server Action)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
