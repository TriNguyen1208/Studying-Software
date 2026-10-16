/**
 * productController.js - Điều khiển nghiệp vụ sản phẩm
 * Phục vụ các endpoint:
 * - GET /api/products: Lấy danh sách sản phẩm (Dùng cho Next.js SSG / SSR / RSC)
 * - GET /api/products/:id: Lấy chi tiết sản phẩm (Dùng cho Next.js Dynamic Route & ISR)
 * - GET /api/products/:id/reviews: Lấy danh sách review có giả lập độ trễ (Delay 1.5s) để Next.js minh họa React Streaming & Suspense!
 */

const store = require('../store');

const productController = {
  // 1. Lấy danh sách tất cả sản phẩm
  getAllProducts: (req, res) => {
    const products = store.getAllProducts();
    // Giả lập header cache HTTP chuẩn
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  },

  // 2. Lấy chi tiết 1 sản phẩm
  getProductById: (req, res) => {
    const { id } = req.params;
    const product = store.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sản phẩm với mã "${id}".`
      });
    }

    res.json({
      success: true,
      data: product
    });
  },

  // 3. Lấy reviews kèm giả lập trễ mạng (Network Latency Simulation)
  // Mục đích: Cho phép Next.js dùng <Suspense> để stream HTML sản phẩm ngay lập tức,
  // và stream tiếp phần reviews sau 1.5 giây mà không làm đơ trang!
  getProductReviews: async (req, res) => {
    const { id } = req.params;
    const product = store.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sản phẩm.`
      });
    }

    // Giả lập trễ mạng hoặc truy vấn phân tích nặng tốn 1.5 giây
    await new Promise(resolve => setTimeout(resolve, 1500));

    res.json({
      success: true,
      productId: id,
      reviews: product.reviews || []
    });
  }
};

module.exports = productController;
