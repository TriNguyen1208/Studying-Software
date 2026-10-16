/**
 * seed.js - Khởi tạo dữ liệu mẫu cho hệ sinh thái TechStore
 * Dữ liệu bao gồm các sản phẩm phần cứng, khóa học công nghệ cao cấp,
 * số lượng tồn kho (inventory) và các đánh giá (reviews) phục vụ demo Streaming Suspense của Next.js.
 */

const initialProducts = [
  {
    id: "prod-1",
    name: "MacBook Pro M3 Max - 64GB Unified RAM",
    slug: "macbook-pro-m3-max",
    category: "Hardware",
    price: 3499,
    originalPrice: 3899,
    stock: 12,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    description: "Quái vật đồ họa & lập trình với chip Apple Silicon M3 Max 16-Core CPU, 40-Core GPU, màn hình Liquid Retina XDR 120Hz.",
    specs: {
      cpu: "Apple M3 Max 16-core",
      ram: "64GB Unified Memory",
      ssd: "1TB PCIe Gen 4",
      screen: "16.2 inch Liquid Retina XDR"
    },
    reviews: [
      { id: "rev-101", user: "Alex Nguyen (Staff Engineer)", rating: 5, comment: "Biên dịch Next.js 14 App Router chỉ mất vài giây, quá khủng khiếp!", date: "2026-03-01" },
      { id: "rev-102", user: "Minh Tran (DevOps Lead)", rating: 5, comment: "Chạy cùng lúc 10 container Docker + Kubernetes cluster không hề nóng máy.", date: "2026-03-10" }
    ]
  },
  {
    id: "prod-2",
    name: "Bàn Phím Cơ Custom HHKB Professional Hybrid Type-S",
    slug: "hhkb-pro-hybrid-type-s",
    category: "Hardware",
    price: 320,
    originalPrice: 350,
    stock: 5,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80",
    description: "Switch Topre điện dung không tiếp xúc huyền thoại, kết nối Bluetooth đa thiết bị, thiết kế công thái học đỉnh cao cho Lập trình viên.",
    specs: {
      switch: "Topre Electrostatic Capacitive 45g",
      layout: "60-key Modified HHKB",
      connectivity: "Bluetooth 4.2 & USB-C",
      weight: "540g"
    },
    reviews: [
      { id: "rev-103", user: "Duc Tri (Software Architect)", rating: 5, comment: "Gõ êm ái như gõ trên mây, không gây ồn trong văn phòng mở.", date: "2026-02-15" }
    ]
  },
  {
    id: "prod-3",
    name: "Màn Hình Dell UltraSharp 32 6K Thunderbolt 4 (U3224KB)",
    slug: "dell-ultrasharp-32-6k",
    category: "Hardware",
    price: 2499,
    originalPrice: 2799,
    stock: 8,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
    description: "Độ phân giải siêu thực 6K (6144 x 3456) IPS Black panel, tích hợp 4K HDR Webcam và sạc 140W qua Thunderbolt 4.",
    specs: {
      resolution: "6K 6144 x 3456 at 60Hz",
      panel: "IPS Black 2000:1 contrast",
      ports: "Thunderbolt 4, HDMI 2.1, DP 2.1, 2.5GbE RJ45",
      camera: "Dual Gain HDR 4K Sony Sensor"
    },
    reviews: [
      { id: "rev-104", user: "Elena Rostova (UI/UX Designer)", rating: 5, comment: "Màu sắc chính xác 99% DCI-P3, xem trước giao diện web cực đã.", date: "2026-01-20" }
    ]
  },
  {
    id: "prod-4",
    name: "Mastering Next.js 15 & System Architecture Hardcore",
    slug: "mastering-nextjs-15-hardcore",
    category: "Course",
    price: 199,
    originalPrice: 299,
    stock: 999, // Digital product không lo hết hàng
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
    description: "Khóa học chuyên sâu bóc tách bản chất lõi: React Server Components, Streaming HTTP/2, Fiber Hydration và High Scale Caching Layers.",
    specs: {
      duration: "45 giờ video 4K",
      projects: "4 Full-Stack Enterprise Projects",
      certificate: "Có chứng chỉ số xác thực Blockchain",
      support: "Mentoring 1-on-1 hàng tuần"
    },
    reviews: [
      { id: "rev-105", user: "Hoang Nam (Senior Frontend)", rating: 5, comment: "Khóa học đào sâu vào tận RSC Wire format và TCP stream, mở mang tầm mắt!", date: "2026-03-05" }
    ]
  }
];

module.exports = { initialProducts };
