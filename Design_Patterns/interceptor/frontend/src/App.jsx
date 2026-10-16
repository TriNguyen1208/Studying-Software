import React, { useState, useEffect } from 'react';
import axiosClient from './api/axiosClient';

function App() {
  // STATE ĐỂ GIỮ TRẠNG THÁI ĐĂNG NHẬP Ở FRONTEND (Lưu trên bộ nhớ RAM)
  // Tuyệt đối không lưu Token ở localStorage nữa. Ta chỉ lưu thông tin User.
  const [user, setUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true); // Trạng thái màn hình loading lúc mới mở web

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // KỊCH BẢN KHI USER MỚI MỞ WEB LÊN HOẶC F5 RELOAD LẠI TRANG
  useEffect(() => {
    const fetchMe = async () => {
      try {
        // Trình duyệt sẽ tự động đính kèm Cookie (nếu có) gửi lên API /me
        // Nếu token trong cookie hết hạn, Interceptor sẽ TỰ ĐỘNG xử lý xin cấp lại
        const response = await axiosClient.get('/me');
        
        // Xin thành công => Set user vào state, user đã đăng nhập.
        setUser(response); 
      } catch (err) {
        // Xin thất bại (Do chưa có cookie, hoặc cả refresh token cũng hết hạn)
        // Set user = null, hiện nút Đăng nhập
        setUser(null); 
      } finally {
        setIsInitializing(false); // Tắt màn hình loading
      }
    };

    fetchMe();
  }, []);

  // Gọi API login để Server tự động set Cookie
  const simulateLogin = async () => {
    try {
      const res = await axiosClient.post('/login');
      alert(res.message + " (Đã cấp Cookie)");
      
      // Sau khi đăng nhập thành công, Server đã nhét Cookie vào trình duyệt.
      // Việc của ta bây giờ là gọi lại hàm lấy thông tin User để hiển thị lên UI
      const meResponse = await axiosClient.get('/me');
      setUser(meResponse); // Lưu vào state

      setData(null);
      setError(null);
    } catch (err) {
      alert("Lỗi login: " + err.message);
    }
  };

  // Gọi API logout để Server tự động xóa Cookie
  const logout = async () => {
    try {
      const res = await axiosClient.post('/logout');
      alert(res.message);
      
      // Xóa thông tin user khỏi UI
      setUser(null); 
      setData(null);
    } catch (err) {
      alert("Lỗi logout: " + err.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      // ẢO THUẬT COOKIE:
      // Code gọi API bình thường. Trình duyệt sẽ TỰ ĐỘNG đính kèm cookie HttpOnly.
      // JS (Frontend) hoàn toàn "MÙ", không hề nhìn thấy token trong localStorage hay cookie.
      // Nếu cookie báo lỗi 401, Interceptor sẽ tự xin lại token và trình duyệt tự động ghi đè cookie mới.
      
      const response = await axiosClient.get('/data');
      
      console.log("Kết quả trả về Component:", response);
      setData(response.data); 
    } catch (err) {
      console.error("Lỗi bắt được ở Component:", err);
      setError(err.response?.data?.message || err.message || "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return <div style={{ padding: '50px' }}>Đang kiểm tra trạng thái đăng nhập (đang kiểm tra Cookie)...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Demo Axios Interceptor (Phiên bản dùng Cookie)</h1>
      <p>Bật F12 (Network tab) để xem cách Browser tự động đính kèm Cookie và cách Interceptor chạy ngầm gọi refresh token.</p>
      
      {/* HIỂN THỊ TRẠNG THÁI USER */}
      <div style={{ background: '#f5f5f5', padding: '15px', marginBottom: '20px', borderRadius: '8px' }}>
        {user ? (
           <h3 style={{ color: '#4CAF50', margin: 0 }}>🟢 Đã đăng nhập: Xin chào {user.name} (@{user.username})!</h3>
        ) : (
           <h3 style={{ color: '#f44336', margin: 0 }}>🔴 Trạng thái: Chưa đăng nhập</h3>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {!user && (
            <button onClick={simulateLogin} style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
              1. Đăng nhập (Lấy Cookie)
            </button>
        )}
        
        {user && (
            <>
              <button onClick={fetchData} disabled={loading} style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>
                {loading ? 'Đang gọi API...' : '2. Gọi API Bất Kỳ Lấy Dữ Liệu'}
              </button>
              <button onClick={logout} style={{ padding: '10px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>
                3. Đăng xuất (Xóa Cookie)
              </button>
            </>
        )}
      </div>

      {error && (
        <div style={{ background: '#ffebee', padding: '15px', border: '1px solid #ef5350', color: '#c62828' }}>
          <strong>Lỗi rồi: </strong> {error}
        </div>
      )}

      {data && (
        <div style={{ background: '#e8f5e9', padding: '15px', border: '1px solid #66bb6a', color: '#2e7d32' }}>
          <h3>Dữ liệu lấy được thành công!</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
