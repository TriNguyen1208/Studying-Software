/**
 * middleware.js - Next.js Edge Middleware
 * 
 * 💡 BẢN CHẤT LÕI:
 * - Chạy trước mọi request tại tầng Edge (sử dụng V8 Isolate siêu nhẹ).
 * - Dùng để rewrite, redirect, can thiệp HTTP headers, kiểm tra Auth token hoặc đo đạc thời gian phản hồi.
 */

import { NextResponse } from 'next/server';

export function middleware(request) {
  const start = Date.now();
  const response = NextResponse.next();

  // Đính kèm Custom Header đo lường latency của Next.js Middleware
  response.headers.set('X-Nextjs-Edge-Middleware', 'Active');
  response.headers.set('X-Response-Time-Ms', `${Date.now() - start}`);

  return response;
}

// Cấu hình matcher để chỉ áp dụng cho các route cần thiết (bỏ qua static files, favicon)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
