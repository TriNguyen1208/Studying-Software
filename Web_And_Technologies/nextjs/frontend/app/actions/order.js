'use server';

/**
 * app/actions/order.js - Next.js Server Actions (Thao Tác Phía Máy Chủ)
 * 
 * 💡 BẢN CHẤT LÕI SERVER ACTIONS TRONG NEXT.JS:
 * - Khai báo directive 'use server' ở đầu file hoặc đầu hàm.
 * - Cho phép gọi hàm trực tiếp từ Client Component hoặc thẻ <form action={...}> mà không cần tạo file API Route thủ công.
 * - Next.js tự động tạo một POST endpoint mã hóa ngầm dưới nền.
 * - Cho phép gọi revalidatePath() và revalidateTag() để hủy cache (Cache Invalidation) trên Server ngay sau khi mutation hoàn tất!
 */

import { revalidatePath, revalidateTag } from 'next/cache';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

export async function submitOrderAction(orderPayload) {
  try {
    const { customerName, email, items, totalAmount } = orderPayload;

    if (!customerName || !email || !items || items.length === 0) {
      return {
        success: false,
        error: "Vui lòng điền đầy đủ họ tên, email và chọn ít nhất 1 sản phẩm."
      };
    }

    // 1. Chuyển tiếp request đặt hàng tới Backend Node.js
    const res = await fetch(`${BACKEND_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName,
        email,
        items,
        totalAmount
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.message || "Không thể xử lý đơn hàng trên máy chủ Backend."
      };
    }

    // 2. TÍNH NĂNG VÀNG CỦA NEXT.JS: Cache Invalidation
    // Làm mới cache của trang chủ và chi tiết sản phẩm để cập nhật số lượng tồn kho mới nhất
    revalidateTag('products');
    revalidatePath('/');
    revalidatePath('/checkout');

    return {
      success: true,
      order: data.order,
      message: "Đặt hàng thành công! Đã cập nhật cache Next.js và gửi thông báo tới Node.js SSE."
    };
  } catch (err) {
    console.error('[SERVER ACTION ERROR]:', err);
    return {
      success: false,
      error: err.message || "Lỗi máy chủ nội bộ trong quá trình thực thi Server Action."
    };
  }
}
