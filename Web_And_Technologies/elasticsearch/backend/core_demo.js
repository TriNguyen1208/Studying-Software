const { Client } = require('@elastic/elasticsearch'); // Import thư viện Elasticsearch client chính thức cho Node.js

// Khởi tạo một client kết nối đến Elasticsearch server đang chạy ở localhost cổng 9200
const client = new Client({ node: 'http://localhost:9200' });

/**
 * Hàm main để chạy demo Elasticsearch Core
 * Hàm này bao gồm: Tạo Index (Database), Định nghĩa Mapping (Schema),
 * Thêm dữ liệu (Insert) và Tìm kiếm Full-text (Search)
 */
async function runDemo() {
  try {
    // 1. Khai báo tên Index (giống như tên Bảng trong SQL, nhưng ở ES gọi là Index)
    const indexName = 'products_demo';
    
    // 2. Kiểm tra xem Index đã tồn tại chưa
    const indexExists = await client.indices.exists({ index: indexName });
    
    // 3. Nếu đã tồn tại, xóa Index cũ đi để demo chạy lại từ đầu mà không bị trùng dữ liệu
    if (indexExists) {
      await client.indices.delete({ index: indexName });
      console.log(`Đã xóa index cũ: ${indexName}`);
    }

    // 4. Tạo Index mới kèm theo Mapping
    // Mapping giống như việc định nghĩa Schema (kiểu dữ liệu các cột) trong SQL
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            // Trường 'id' có kiểu là 'integer' (số nguyên)
            id: { type: 'integer' },
            
            // Trường 'name' là tên sản phẩm, dùng để search autocomplete và full-text
            // Kiểu 'search_as_you_type' sẽ tự động sinh ra các N-gram dưới nền tảng (vd: "ip", "iph", "iphon")
            name: { type: 'search_as_you_type' },
            
            // Trường 'category' là phân loại, thường dùng để filter (Lọc) chứ không full-text search
            // Kiểu 'keyword' bắt buộc phải khớp chính xác 100% mới tìm ra
            category: { type: 'keyword' },
            
            // Trường 'description' là mô tả dài, dùng full-text search với bộ phân tích 'standard'
            description: { type: 'text', analyzer: 'standard' },
            
            // Trường 'price' kiểu số thực (float) để so sánh giá (lớn hơn, nhỏ hơn)
            price: { type: 'float' }
          }
        }
      }
    });
    console.log(`Đã tạo index mới: ${indexName} cùng với mapping.`);

    // 5. Chuẩn bị dữ liệu mẫu (Mock data)
    const products = [
      { id: 1, name: "Apple iPhone 15 Pro Max", category: "Smartphone", description: "Điện thoại mới nhất của Apple với khung Titanium", price: 1199.99 },
      { id: 2, name: "Samsung Galaxy S24 Ultra", category: "Smartphone", description: "Điện thoại Android mạnh mẽ với AI tích hợp, bút S-Pen", price: 1299.99 },
      { id: 3, name: "Apple MacBook Pro M3", category: "Laptop", description: "Laptop hiệu năng cao cho dân chuyên nghiệp", price: 1999.99 },
      { id: 4, name: "Sony WH-1000XM5", category: "Headphone", description: "Tai nghe chống ồn chủ động không dây đỉnh cao", price: 349.99 }
    ];

    // 6. Chuyển đổi dữ liệu thành định dạng Bulk để insert nhiều record cùng lúc cho tối ưu hiệu suất
    // Bulk API yêu cầu một mảng xen kẽ: [Hành động, Dữ liệu, Hành động, Dữ liệu,...]
    const operations = products.flatMap(doc => [
      // Chỉ định hành động là 'index' (insert/update), vào index nào, và ID của document là gì
      { index: { _index: indexName, _id: doc.id.toString() } },
      // Dữ liệu thực tế của document
      doc
    ]);

    // 7. Thực thi lệnh Bulk insert. Tham số `refresh: true` bắt buộc ES cập nhật Index ngay lập tức 
    // để dữ liệu có thể được search ra liền (nếu không, ES mặc định chờ 1s mới refresh)
    const bulkResponse = await client.bulk({ refresh: true, operations });
    
    // Kiểm tra xem quá trình insert có lỗi nào không
    if (bulkResponse.errors) {
      console.log('Có lỗi khi insert:', bulkResponse.items);
    } else {
      console.log(`Đã insert ${products.length} sản phẩm thành công.`);
    }

    // 8. THỰC HIỆN TÌM KIẾM CƠ BẢN (Search)
    console.log('\n--- BẮT ĐẦU TÌM KIẾM ---');
    
    // Câu truy vấn: Người dùng gõ "ipho", muốn tìm theo kiểu Autocomplete và Giá < 1500
    const userKeyword = "ipho";

    const searchResult = await client.search({
      index: indexName, // Tìm trong index products_demo
      body: {
        // Sử dụng bool query để kết hợp nhiều điều kiện tìm kiếm lại với nhau
        query: {
          bool: {
            // Điều kiện 'must': Bắt buộc phải thỏa mãn (Giống toán tử AND)
            must: [
              {
                // Sử dụng multi_match để tìm trên nhiều trường
                multi_match: {
                  query: userKeyword, // Từ khóa "ipho"
                  type: 'bool_prefix', // Sử dụng kiểu prefix để hỗ trợ gõ đến đâu tìm đến đó
                  fields: [
                    'name', // Tìm trong trường name gốc
                    'name._2gram', // Tìm trong cặp 2 ký tự (do search_as_you_type tạo ra)
                    'name._3gram'  // Tìm trong cặp 3 ký tự 
                  ]
                }
              }
            ],
            // Điều kiện 'filter': Bắt buộc thỏa mãn nhưng KHÔNG tính điểm (score), giúp tăng hiệu năng
            filter: [
              {
                // Lọc theo khoảng giá (range)
                range: {
                  price: {
                    lte: 1500 // lte = Less Than or Equal (Nhỏ hơn hoặc bằng 1500)
                  }
                }
              }
            ]
          }
        },
        // Yêu cầu Elasticsearch trả về đoạn văn bản có làm nổi bật (Highlight) từ khóa tìm được
        highlight: {
          fields: {
            name: {} // Highlight trên trường name
          }
        }
      }
    });

    // 9. In kết quả ra màn hình
    console.log(`Tìm thấy ${searchResult.hits.total.value} kết quả phù hợp:`);
    searchResult.hits.hits.forEach(hit => {
      // hit._source chứa dữ liệu gốc ta đã insert
      // hit._score chứa điểm số mức độ liên quan (càng cao càng khớp)
      // hit.highlight chứa các trường đã được bọc bằng thẻ HTML (thường là <em>)
      console.log(`- Điểm (Score): ${hit._score}`);
      console.log(`  Sản phẩm: ${hit._source.name} (Giá: $${hit._source.price})`);
      if (hit.highlight && hit.highlight.name) {
        console.log(`  Highlight: ${hit.highlight.name[0]}`);
      }
    });

  } catch (error) {
    // Xử lý lỗi nếu có ngoại lệ xảy ra
    console.error('Lỗi quá trình chạy demo:', error);
  }
}

// Gọi hàm chạy demo
runDemo();
