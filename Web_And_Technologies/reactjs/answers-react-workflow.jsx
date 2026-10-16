// File: answers-react-workflow.jsx
// Đáp án bài tập thực hành nhỏ: Tối ưu hiệu suất Rerender tránh tính toán lại không cần thiết

import React, { useState, useMemo } from 'react'; // Tải React và Hook useMemo

// Giả sử đây là một hàm tính toán tốn rất nhiều thời gian và CPU (VD: xử lý mảng hàng nghìn phần tử)
const tinhToanPhucTap = (number) => {
    console.log("CẢNH BÁO: Đang thực hiện phép tính siêu nặng...");
    let result = 0;
    // Vòng lặp mô phỏng việc chạy tốn tài nguyên
    for (let i = 0; i < 1000000000; i++) {
        result += number;
    }
    return result;
};

const ExpensiveComponent = () => {
    // State 1: Biến đếm số bình thường. Mỗi khi thay đổi sẽ khiến cả Component bị re-render lại.
    const [count, setCount] = useState(0);
    
    // State 2: Biến làm đầu vào cho hàm tính toán siêu nặng ở trên.
    const [inputValue, setInputValue] = useState(1);

    // ==========================================
    // VẤN ĐỀ (ANTI-PATTERN TRƯỚC KHI SỬA):
    // const ketQua = tinhToanPhucTap(inputValue); 
    // -> NẾU VIẾT THẾ NÀY: Mỗi khi người dùng bấm nút tăng biến 'count', 
    // Component sẽ render lại và hàm tinhToanPhucTap() vô tình bị gọi lại (dù inputValue không hề đổi), 
    // làm toàn bộ giao diện bị đơ (lag) trong vài giây.
    // ==========================================

    // ==========================================
    // CÁCH SỬA (ĐÁP ÁN DÙNG useMemo): 
    // Sử dụng Hook useMemo để "ghi nhớ" (cache/memoize) kết quả tính toán.
    // React sẽ đóng băng kết quả này lại. Hàm bên trong useMemo CHỈ chạy lại 
    // nếu biến nằm trong mảng dependency (ở đây là [inputValue]) có sự thay đổi.
    // Nhờ vậy, khi click đổi biến 'count', React bỏ qua bước tính toán và dùng lại kết quả cũ ngay lập tức!
    // ==========================================
    const ketQua = useMemo(() => {
        return tinhToanPhucTap(inputValue);
    }, [inputValue]); // Mảng Dependency chỉ phụ thuộc vào biến inputValue

    // Khối Render trả về Virtual DOM
    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h3>Bộ Đếm Nhanh Nhạy (Độc Lập)</h3>
            <p>Bấm nút này sẽ thay đổi state count, gây ra vòng lặp Re-render toàn bộ.</p>
            {/* Cập nhật count gây re-render nhưng không làm UI bị giật lag nữa */}
            <button onClick={() => setCount(count + 1)} style={{ padding: '10px', fontSize: '16px' }}>
                Giá trị đếm hiện tại: {count}
            </button>
            
            <hr style={{ margin: '20px 0' }}/>
            
            <h3>Máy Tính Cồng Kềnh</h3>
            <p>Nhập số vào ô này để tính toán (Sẽ hơi giật vì vòng lặp 1 tỷ lần):</p>
            {/* Chỉ khi đổi inputValue, hàm tinhToanPhucTap mới thực sự chạy lại */}
            <input 
                type="number" 
                value={inputValue} 
                onChange={(e) => setInputValue(Number(e.target.value))} 
                style={{ padding: '8px', fontSize: '16px' }}
            />
            {/* Hiển thị kết quả đã được bộ nhớ đệm (cache) lưu lại */}
            <p><strong>Kết quả tính toán: {ketQua}</strong></p>
        </div>
    );
};

export default ExpensiveComponent; // Xuất Component ra ngoài
