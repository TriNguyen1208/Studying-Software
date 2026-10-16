/**
 * ĐÁP ÁN BÀI TẬP: TÍNH NĂNG ĐẾM LƯỢT XEM TRONG JAMSTACK
 * Yêu cầu: Kết hợp API (A) và JavaScript (J) để đắp dữ liệu động (Số view) vào trang HTML tĩnh (M).
 */

// ============================================================================
// 1. PHẦN SERVER (api/server.js) - CUNG CẤP API
// ============================================================================
// Import framework express để tạo server
const express = require('express');
// Import cors để cho phép gọi API từ một domain khác (front-end tĩnh)
const cors = require('cors');

const app = express();
const port = 3001;

// Bật CORS middleware cho toàn bộ app
app.use(cors());

// Biến lưu trữ số view trong bộ nhớ RAM (Trong thực tế sẽ dùng Database)
// Khởi tạo biến views = 0
let views = 0;

// Định nghĩa Endpoint (Đường dẫn API) để nhận yêu cầu đếm view
// Dùng phương thức POST vì nó làm thay đổi dữ liệu (tăng số đếm)
app.post('/api/views', (req, res) => {
  // Mỗi khi có người chọc vào API này, tăng số views lên 1
  views++;
  // Trả kết quả về cho client dưới dạng JSON (vd: { "views": 1 })
  res.json({ views: views });
});

app.listen(port, () => {
  console.log(`Server API đang chạy tại cổng ${port}`);
});

// ============================================================================
// 2. PHẦN CLIENT (src/main.js) - JAVASCRIPT GỌI API ĐỂ HYDRATE GIAO DIỆN
// ============================================================================
// Đợi cho đến khi toàn bộ thẻ HTML (Markup tĩnh) đã được vẽ xong trên trình duyệt
document.addEventListener('DOMContentLoaded', async () => {
  
  // Bước 1: Tìm vị trí (DOM element) trên trang HTML để nhét số view vào
  // Giả sử trong file index.html chúng ta có sẵn thẻ: <span id="view-counter">Đang tải...</span>
  const viewCounterElement = document.getElementById('view-counter');
  
  // Bước 2: Gọi lên Server (A) để thực hiện logic động
  try {
    // Dùng hàm fetch của trình duyệt để gọi POST request lên API vừa tạo
    const response = await fetch('http://localhost:3001/api/views', {
      method: 'POST' // Phương thức POST khớp với cấu hình server
    });
    
    // Kiểm tra xem server có trả về lỗi (như 404, 500) không
    if (!response.ok) {
      throw new Error("Lỗi khi kết nối với máy chủ API.");
    }
    
    // Bước 3: Ép kiểu dữ liệu trả về từ dạng text sang Object JSON
    const data = await response.json();
    
    // Bước 4: Hydration - Đắp dữ liệu động lên file HTML tĩnh
    // Thay thế chữ "Đang tải..." bằng số lượng view thực tế lấy từ server
    viewCounterElement.innerText = `${data.views} lượt xem`;
    
  } catch (error) {
    // Xử lý lỗi (Error Handling): Best practice cực kỳ quan trọng
    // Nếu server chết, không được để trang web bị trắng bóc (White screen of death)
    // Thay vào đó, báo lỗi nhẹ nhàng trên giao diện tĩnh
    console.error("Lỗi đếm view:", error);
    if(viewCounterElement) {
        viewCounterElement.innerText = "Không thể tải số lượt xem";
        viewCounterElement.style.color = "red";
    }
  }
});
