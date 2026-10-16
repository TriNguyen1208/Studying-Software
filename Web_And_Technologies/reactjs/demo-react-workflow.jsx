// File: demo-react-workflow.jsx
// Code minh hoạ luồng hoạt động chuẩn xác từ lúc React bắt đầu khởi tạo 
// cho đến lúc render cây DOM ảo và commit thay đổi ra UI.

import React, { useState, useEffect, useRef } from 'react'; // Tải thư viện React và các Hooks cần thiết
import { createRoot } from 'react-dom/client'; // Tải thư viện React DOM để gắn React vào trình duyệt (Browser)

// === BƯỚC 1: ĐỊNH NGHĨA COMPONENT (Mô tả giao diện) ===
// Đây là hàm mô tả giao diện (Declarative UI). Hàm này sẽ được React gọi trong Render Phase.
const App = () => {
    // 1.1 Khởi tạo State với useState. 
    // State là "bộ nhớ" của Component. Khi state 'count' bị thay đổi (qua setCount), 
    // React sẽ biết và xếp Component này vào hàng đợi để chuẩn bị render lại (Re-render).
    const [count, setCount] = useState(0); 

    // 1.2 Sử dụng useRef để lưu trữ tham chiếu trực tiếp tới một thẻ DOM thật. 
    // Khác với State, khi giá trị của Ref thay đổi, Component KHÔNG bị render lại.
    const buttonRef = useRef(null); 

    // === BƯỚC 2: RENDER PHASE (PHA KẾT XUẤT) ===
    // Bất cứ code JavaScript nào nằm "trần" trong phần thân hàm này đều thuộc Render Phase.
    // LƯU Ý QUAN TRỌNG: Hàm Component phải là một Pure Function. 
    // Tuyệt đối không gọi API, không dùng setInterval, không thao tác trực tiếp vào DOM tại đây.
    console.log("1. Render Phase: React đang chạy hàm App(), tính toán và tạo Virtual DOM. Count hiện tại là: " + count);

    // === BƯỚC 3: QUẢN LÝ SIDE EFFECTS (CÁC TÁC ĐỘNG PHỤ) ===
    // Hook useEffect sinh ra để chứa các thao tác không thuần khiết (gọi API, chèn DOM trực tiếp).
    // Nó được React gọi SAU KHI Commit Phase (việc cập nhật DOM thật) đã hoàn tất 
    // và Trình duyệt đã tô màu (Painting) xong lên màn hình cho người dùng thấy.
    useEffect(() => {
        // Code bên trong đây chạy an toàn sau khi giao diện đã hiện lên (Layout & Paint).
        console.log("3. Effect chạy: Giao diện đã được vẽ xong trên màn hình với count = " + count);

        // Lúc này Real DOM đã tồn tại thực sự. Ta có thể thao tác với nó qua Ref.
        if (buttonRef.current) {
            // Đổi màu text của thẻ button xen kẽ theo số đếm chẵn lẻ
            buttonRef.current.style.color = count % 2 === 0 ? 'blue' : 'red'; 
        }

        // Cleanup function (Hàm dọn dẹp): 
        // Hàm này được gọi tự động ngay trước khi Effect kế tiếp chuẩn bị chạy lại, 
        // hoặc khi Component bị tháo gỡ (Unmount) khỏi màn hình. Rất quan trọng để xoá Interval hoặc Event Listener.
        return () => {
            console.log("-> Cleanup: Dọn dẹp bộ nhớ trước khi Effect mới chạy.");
        };
    }, [count]); // Mảng Dependency: Effect này chỉ chạy lại nếu biến 'count' có sự thay đổi.

    // === XỬ LÝ SỰ KIỆN TỪ NGƯỜI DÙNG ===
    // Hàm callback này sẽ được gắn vào thuộc tính onClick của nút bấm.
    const handleIncrement = () => {
        // Khi gọi setCount, React KHÔNG cập nhật biến 'count' ngay lập tức (bất đồng bộ).
        // Thay vào đó, nó ghi nhận sự thay đổi, batching (gom nhóm) các cập nhật,
        // và báo hiệu cho hệ thống Fiber rập lịch chạy lại Render Phase (Re-render).
        setCount(prevCount => prevCount + 1); 
    };

    // === TRẢ VỀ GIAO DIỆN MONG MUỐN ===
    // Hàm bắt buộc phải trả về JSX. Dưới nền tảng, Babel biên dịch JSX thành React.createElement(...).
    // Kết quả của đoạn code này chính là cây "Virtual DOM" mà React dùng 
    // để đưa vào thuật toán Reconciliation (Diffing) so sánh cũ-mới.
    return (
        // Thẻ bọc ngoài cùng 
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            {/* Nội dung tĩnh */}
            <h2>React Rendering Workflow Demo</h2>
            
            {/* Hiển thị giá trị State, đây là dữ liệu động */}
            <p>Giá trị hiện tại: {count}</p>
            
            {/* Nút bấm (Button) - Có gắn sự kiện onClick, và tham chiếu ref để thao tác bên trong useEffect */}
            <button ref={buttonRef} onClick={handleIncrement}>
                Tăng giá trị (Kích hoạt Re-render)
            </button>
        </div>
    );
};

// === BƯỚC 4: BOOTSTRAPPING (KHỞI ĐỘNG HỆ THỐNG REACT) ===
// Đoạn code dưới đây chạy duy nhất 1 lần khi trình duyệt tải xong file bundle.js.

// 4.1. Tìm thẻ div có id='root' trong file index.html gốc (Đây là thẻ Real DOM duy nhất code HTML có sẵn)
const rootElement = document.getElementById('root'); 

// 4.2. Tạo một React Root. Đây là điểm khởi tạo của hệ thống React Fiber.
const root = createRoot(rootElement); 

console.log("0. Bắt đầu quá trình Mount (Gắn) ứng dụng lần đầu tiên...");

// 4.3. Gắn Component <App /> vào Root. 
// Kể từ dòng lệnh này, chu trình sống (Lifecycle) chính thức bắt đầu: Render -> Reconciliation -> Commit.
root.render(<App />); 
