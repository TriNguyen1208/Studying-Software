'use client';

/**
 * components/AddToCartButton.jsx - Nút Thêm vào Giỏ Hàng (Client Component)
 * 
 * 💡 TẠI SAO LÀ CLIENT COMPONENT?
 * Trong kiến trúc React Server Components (RSC):
 * - Các thành phần tĩnh (hình ảnh, tên sản phẩm, giá) được render tại SERVER và gửi HTML thô về browser.
 * - Chỉ duy nhất nút bấm có tương tác người dùng (onClick, animation feedback) mới cần chỉ định directive 'use client'.
 * - Điều này giúp giảm thiểu 90% dung lượng JavaScript tải về trình duyệt!
 */

import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Check } from 'lucide-react';

export default function AddToCartButton({ product }) {
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <button
      onClick={handleAdd}
      disabled={isOutOfStock || isAdded}
      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
        isOutOfStock
          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
          : isAdded
          ? 'bg-emerald-600 text-white scale-95'
          : 'bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-sky-200'
      }`}
    >
      {isAdded ? (
        <>
          <Check className="w-4 h-4 text-white" />
          <span>Đã thêm vào giỏ!</span>
        </>
      ) : isOutOfStock ? (
        <span>Hết hàng</span>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" />
          <span>Thêm vào giỏ</span>
        </>
      )}
    </button>
  );
}
