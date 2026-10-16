/**
 * ==============================================================================
 * PRODUCTION-GRADE MONGODB BACKEND SERVICE
 * ==============================================================================
 * Dịch vụ minh chứng các kỹ thuật cốt lõi của MongoDB:
 * 1. Dynamic Schema với BSON Documents & Embedded Subdocuments.
 * 2. Aggregation Pipeline đa giai đoạn ($match, $group, $project, $sort).
 * 3. Đo lường hiệu năng Explain Plan: IXSCAN (Index Scan) vs COLLSCAN (Table Scan).
 * 4. Tự động Seed 5.000 bản ghi mẫu để thử nghiệm tải thực tế.
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 4003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/deep_dive_store';

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------------------
// MONGOOSE SCHEMA & MODEL
// ------------------------------------------------------------------------------
const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  // Trạng thái đơn hàng / sản phẩm
  status: { type: String, default: 'ACTIVE' },
  // TRƯỜNG CÓ INDEX (TỐI ƯU HÓA TÌM KIẾM B-TREE)
  sku: { type: String, required: true, unique: true, index: true },
  // TRƯỜNG KHÔNG CÓ INDEX (DÙNG ĐỂ TEST COLLSCAN)
  legacyBarcode: { type: String },
  // THUỘC TÍNH ĐỘNG DẠNG EMBEDDED OBJECT (BSON FLEXIBILITY)
  specs: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

// ------------------------------------------------------------------------------
// SEED DỮ LIỆU BAN ĐẦU (5.000 BẢN GHI)
// ------------------------------------------------------------------------------
async function seedInitialData() {
  try {
    const count = await Product.countDocuments();
    if (count < 2000) {
      console.log('🌱 Đang nạp 3.000 sản phẩm mẫu vào MongoDB để kiểm thử hiệu năng...');
      const sampleDocs = [];
      const categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports'];

      for (let i = 1; i <= 3000; i++) {
        const cat = categories[i % categories.length];
        sampleDocs.push({
          title: `Sản Phẩm Mẫu #${i} (${cat})`,
          category: cat,
          price: Math.floor(Math.random() * 900) + 50,
          stock: Math.floor(Math.random() * 100),
          status: 'ACTIVE',
          sku: `SKU-PROD-${String(i).padStart(6, '0')}`,
          legacyBarcode: `BARCODE-RAW-${String(i).padStart(6, '0')}`,
          specs: cat === 'Electronics' 
            ? { cpu: 'Apple M3 Pro', ram: '32GB', storage: '1TB SSD' }
            : cat === 'Fashion'
            ? { size: 'XL', color: 'Navy Blue', material: '100% Cotton' }
            : { warrantyYears: 2, origin: 'Made in Vietnam' }
        });
      }

      await Product.insertMany(sampleDocs);
      console.log('✅ Đã nạp thành công 3.000 documents vào MongoDB!');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

// ------------------------------------------------------------------------------
// APIS
// ------------------------------------------------------------------------------

// 1. Lấy danh sách sản phẩm
app.get('/api/products', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 }).limit(12);
  res.status(200).json({ products });
});

// 2. Tạo sản phẩm mới (Hỗ trợ cấu trúc động)
app.post('/api/products', async (req, res) => {
  try {
    const newProd = new Product(req.body);
    await newProd.save();
    res.status(201).json({ success: true, product: newProd });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. AGGREGATION PIPELINE: BÁO CÁO DOANH THU & TỒN KHO THEO DANH MỤC
app.get('/api/aggregate/categories', async (req, res) => {
  const start = performance.now();

  const pipeline = [
    // Giai đoạn 1: $match (Lọc các sản phẩm đang ACTIVE)
    { $match: { status: 'ACTIVE' } },

    // Giai đoạn 2: $group (Gom nhóm theo category và tính toán)
    {
      $group: {
        _id: '$category',
        totalProducts: { $sum: 1 },
        totalInventoryValue: { $sum: { $multiply: ['$price', '$stock'] } },
        avgPrice: { $avg: '$price' },
        totalStock: { $sum: '$stock' }
      }
    },

    // Giai đoạn 3: $project (Định dạng lại trường dữ liệu sạch sẽ)
    {
      $project: {
        category: '$_id',
        totalProducts: 1,
        totalInventoryValue: { $round: ['$totalInventoryValue', 2] },
        avgPrice: { $round: ['$avgPrice', 2] },
        totalStock: 1,
        _id: 0
      }
    },

    // Giai đoạn 4: $sort (Sắp xếp theo tổng giá trị tồn kho giảm dần)
    { $sort: { totalInventoryValue: -1 } }
  ];

  const results = await Product.aggregate(pipeline);
  const duration = Math.round(performance.now() - start);

  res.status(200).json({
    executionTimeMs: duration,
    results
  });
});

// 4. BENCHMARK: EXPLAIN PLAN TRUY VẤN CÓ INDEX (IXSCAN)
app.get('/api/benchmark/indexed', async (req, res) => {
  const targetSku = 'SKU-PROD-002500';
  const start = performance.now();

  // Chạy explain trên trường có index 'sku'
  const explainResult = await Product.find({ sku: targetSku }).explain('executionStats');
  const duration = Math.round(performance.now() - start);

  const stats = explainResult.executionStats;
  res.status(200).json({
    queryType: 'INDEXED_SCAN (IXSCAN)',
    searchField: 'sku',
    totalDocsExamined: stats.totalDocsExamined, // Số document phải quét
    totalKeysExamined: stats.totalKeysExamined, // Số index key duyệt
    executionTimeMillis: stats.executionTimeMillis,
    clientTimeMs: duration,
    winningPlanStage: stats.executionStages.stage
  });
});

// 5. BENCHMARK: EXPLAIN PLAN TRUY VẤN KHÔNG CÓ INDEX (COLLSCAN)
app.get('/api/benchmark/unindexed', async (req, res) => {
  const targetBarcode = 'BARCODE-RAW-002500';
  const start = performance.now();

  // Chạy explain trên trường không có index 'legacyBarcode'
  const explainResult = await Product.find({ legacyBarcode: targetBarcode }).explain('executionStats');
  const duration = Math.round(performance.now() - start);

  const stats = explainResult.executionStats;
  res.status(200).json({
    queryType: 'COLLECTION_SCAN (COLLSCAN)',
    searchField: 'legacyBarcode',
    totalDocsExamined: stats.totalDocsExamined, // Sẽ quét sạch toàn bộ collection!
    totalKeysExamined: stats.totalKeysExamined,
    executionTimeMillis: stats.executionTimeMillis,
    clientTimeMs: duration,
    winningPlanStage: stats.executionStages.stage
  });
});

// Kết nối MongoDB và khởi động server
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`✅ Kết nối thành công tới MongoDB: ${MONGO_URI}`);
    await seedInitialData();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MongoDB Backend service listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Lỗi kết nối MongoDB:', err);
    process.exit(1);
  });
