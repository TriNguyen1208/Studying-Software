/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cấu hình cho phép load hình ảnh từ Unsplash
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Bật logging hỗ trợ debug Data Fetching & Caching trong Next.js App Router
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
