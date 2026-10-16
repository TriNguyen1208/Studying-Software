/**
 * app/api/health/route.js - Next.js Route Handler
 * 
 * 💡 BẢN CHẤT LÕI ROUTE HANDLERS:
 * - Thay thế cho Pages Router API Routes (pages/api/*).
 * - Sử dụng Web Request và Response APIs tiêu chuẩn (Web Standards).
 * - Có thể cấu hình chạy trên Node.js Runtime hoặc Edge Runtime bằng `export const runtime = 'edge'`.
 */

export async function GET() {
  return Response.json({
    status: 'healthy',
    framework: 'Next.js 14 App Router',
    runtime: process.env.NEXT_RUNTIME || 'nodejs',
    timestamp: new Date().toISOString(),
    nodeBackendConnected: true,
  });
}
