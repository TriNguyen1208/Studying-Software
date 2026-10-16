/**
 * lib/api.js - HTTP Client tích hợp bộ nhớ cache của Next.js (Next Extended Fetch)
 * 
 * 💡 KIẾN THỨC CỐT LÕI VỀ NEXT.JS:
 * - Next.js ghi đè (monkey-patch) hàm fetch() toàn cục trên Node.js runtime.
 * - Cho phép gắn cấu hình bộ nhớ đệm đa tầng:
 *   + { cache: 'force-cache' }: Tương đương Static Site Generation (SSG), lưu vĩnh viễn.
 *   + { cache: 'no-store' }: Tương đương Server-Side Rendering (SSR), gọi lại mỗi request.
 *   + { next: { revalidate: 30 } }: Tương đương Incremental Static Regeneration (ISR).
 *   + { next: { tags: ['products'] } }: On-demand revalidation qua Server Actions!
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

export async function fetchAllProducts() {
  try {
    // Sử dụng ISR: Dữ liệu được lưu cache trên server Next.js và tự động làm mới sau 30 giây
    const res = await fetch(`${API_BASE_URL}/products`, {
      next: {
        revalidate: 30,
        tags: ['products']
      }
    });

    if (!res.ok) {
      throw new Error(`Lỗi kết nối Backend: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('[NEXT.JS FETCH ERROR - fetchAllProducts]:', err.message);
    return [];
  }
}

export async function fetchProductById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      next: {
        revalidate: 30,
        tags: [`product-${id}`]
      }
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error(`[NEXT.JS FETCH ERROR - fetchProductById ${id}]:`, err.message);
    return null;
  }
}

export async function fetchProductReviews(id) {
  try {
    // no-store: Luôn gọi fresh data từ backend mỗi khi render
    const res = await fetch(`${API_BASE_URL}/products/${id}/reviews`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.reviews || [];
  } catch (err) {
    console.error(`[NEXT.JS FETCH ERROR - fetchProductReviews ${id}]:`, err.message);
    return [];
  }
}
