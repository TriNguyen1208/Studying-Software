import axios from 'axios';

// =======================================================
// 1. KHỞI TẠO INSTANCE CỦA AXIOS
// =======================================================
const axiosClient = axios.create({
    baseURL: 'http://localhost:4000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    // CỰC KỲ QUAN TRỌNG: Cho phép đính kèm Cookie vào mọi request cross-origin
    withCredentials: true 
});

// =======================================================
// CƠ CHẾ CHỐNG SPAM REFRESH TOKEN (RACE CONDITION)
// =======================================================
// isRefreshing: Cờ hiệu (Khóa). Khi có 1 API đang gọi /refresh-token rồi, 
// các API bị lỗi 401 đến sau sẽ thấy cờ này bật và không đi gọi /refresh-token nữa.
let isRefreshing = false;

// failedQueue: Hàng đợi (Phòng chờ). Nơi chứa các API đến sau bị lỗi 401.
// Chúng bị đóng băng (bằng Promise) và nằm ở đây để chờ thằng đầu tiên xin token về.
let failedQueue = [];

// processQueue: Hàm thông báo kết quả cho phòng chờ.
// Khi quá trình xin token mới kết thúc, hàm này sẽ lôi các API đang chờ ra đánh thức.
const processQueue = (error) => {
    failedQueue.forEach(prom => {
        if (error) {
            // Nếu xin token thất bại, báo lỗi (reject) cho tất cả các API đang chờ
            prom.reject(error);
        } else {
            // Nếu thành công, giải phóng (resolve) các API đang chờ.
            // Khi thức dậy chạy lại request gốc, trình duyệt sẽ tự đính kèm cookie chứa token mới.
            prom.resolve(); 
        }
    });
    // Đánh thức xong thì dọn dẹp phòng chờ
    failedQueue = [];
};

// =======================================================
// 2. REQUEST INTERCEPTOR (Không cần xử lý Token nữa)
// =======================================================
// Vì dùng Cookie (httpOnly = true), trình duyệt sẽ TỰ ĐỘNG gửi cookie đi mỗi khi gọi API.
// Mã JS của chúng ta (kể cả axios) không thể đọc được httpOnly cookie, và cũng KHÔNG CẦN ĐỌC.
// Ta có thể bỏ hoàn toàn đoạn nhét "Authorization Header" ở đây.
// (Bạn có thể dùng Request Interceptor này vào việc khác, vd bật Loading Screen).

// =======================================================
// 3. RESPONSE INTERCEPTOR (Chặn lỗi 401 để gọi Refresh Token)
// =======================================================
axiosClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 (Hết hạn Access Token)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            
            // Đang có 1 tiến trình xin refresh token chạy rồi
            if (isRefreshing) {
                // Nhét request này vào hàng đợi chờ refresh xong
                return new Promise(function(resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                .then(() => {
                    // Khi được giải phóng, trình duyệt tự đính kèm cookie mới, chỉ cần gọi lại request gốc
                    return axiosClient(originalRequest);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true; 

            try {
                // Gọi API refresh token. 
                // TRÌNH DUYỆT SẼ TỰ ĐỘNG GỬI COOKIE "refresh_token" LÊN
                // Lưu ý set withCredentials: true để gửi cookie (nếu dùng axios rời không qua axiosClient)
                await axios.post('http://localhost:4000/api/refresh-token', {}, {
                    withCredentials: true 
                });

                // Nếu gọi thành công, Backend đã TỰ ĐỘNG set đè cookie access_token mới lên Browser.
                // JS không cần phải lấy token từ response để localStorage.setItem nữa. Mọi thứ rất phép thuật!

                // Báo cho các request đang chờ biết là refresh xong rồi
                processQueue(null);

                // Gọi lại request ban đầu (trình duyệt tự đính cookie access_token mới vào)
                return axiosClient(originalRequest);

            } catch (err) {
                // Refresh token thất bại (hết hạn hoặc server báo lỗi)
                processQueue(err);
                alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
                // JS không thể tự xóa HttpOnly cookie, Server phải trả về res.clearCookie khi lỗi.
                // window.location.href = '/login'; 
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
