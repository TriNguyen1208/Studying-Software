// Import thư viện express để tạo server
const express = require('express');
// Import cors để cho phép Frontend (chạy khác port) gọi được API
const cors = require('cors');
// Import cookie-parser để đọc cookie từ request
const cookieParser = require('cookie-parser');

const app = express();

// CẤU HÌNH CỰC KỲ QUAN TRỌNG KHI DÙNG COOKIE VỚI CORS
// Phải set credentials: true và chỉ định origin cụ thể (không dùng '*')
app.use(cors({
    origin: 'http://localhost:5173', // Port mặc định của Vite React (Thay đổi nếu Frontend chạy port khác)
    credentials: true
}));

app.use(express.json());
// Bật middleware đọc cookie
app.use(cookieParser());

// Biến lưu trữ token hợp lệ
const VALID_ACCESS_TOKEN = 'access_token_hieu_luc';
const VALID_REFRESH_TOKEN = 'refresh_token_sieu_cap';

// ==========================================
// 1. API LOGIN (Cấp phát Cookie)
// ==========================================
app.post('/api/login', (req, res) => {
    // Giả lập đăng nhập thành công nhưng cố tình set token hết hạn để test Interceptor
    // Thực tế sẽ set VALID_ACCESS_TOKEN
    res.cookie('access_token', 'token_bi_het_han_roi_hihi', {
        httpOnly: true, // Chống XSS
        secure: false, // Vì chạy localhost, nếu deploy thì để true
        sameSite: 'lax', // Chống CSRF
        maxAge: 15 * 60 * 1000 // 15 phút
    });

    res.cookie('refresh_token', VALID_REFRESH_TOKEN, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 ngày
    });

    res.json({ message: 'Đăng nhập thành công và đã set Cookie!' });
});

// ==========================================
// 2. API LOGOUT (Xóa Cookie)
// ==========================================
app.post('/api/logout', (req, res) => {
    // Gọi hàm xóa cookie
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ message: 'Đã xóa Cookie!' });
});

// ==========================================
// 3. API GET DATA (Yêu cầu phải có Cookie Access Token)
// ==========================================
app.get('/api/data', (req, res) => {
    // ĐỌC TOKEN TỪ COOKIE (thay vì Header Authorization)
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ message: 'Không tìm thấy Token trong Cookie!' });
    }

    if (token !== VALID_ACCESS_TOKEN) {
        // Báo lỗi 401 để Frontend Interceptor biết mà đi xin lại token
        return res.status(401).json({ message: 'Token đã hết hạn hoặc không hợp lệ!', code: 'TOKEN_EXPIRED' });
    }

    res.json({
        message: 'Lấy dữ liệu thành công!',
        data: { id: 1, name: 'Dữ liệu tuyệt mật lấy qua Cookie', role: 'admin' }
    });
});

// ==========================================
// 4. API REFRESH TOKEN (Đổi Refresh Token lấy Access Token mới)
// ==========================================
app.post('/api/refresh-token', (req, res) => {
    // LẤY REFRESH TOKEN TỪ COOKIE (An toàn hơn lưu ở localStorage rất nhiều)
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
        return res.status(403).json({ message: 'Thiếu Refresh Token trong Cookie!' });
    }

    if (refreshToken === VALID_REFRESH_TOKEN) {
        // Nếu hợp lệ, cấp phát Access Token mới và SET THẲNG VÀO COOKIE
        res.cookie('access_token', VALID_ACCESS_TOKEN, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000
        });

        // Trả về báo thành công, không cần trả accessToken ra body JSON
        return res.json({ message: 'Refresh token thành công!' });
    } else {
        // Refresh token sai -> Ép đăng xuất bằng cách xóa cookie
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return res.status(403).json({ message: 'Refresh Token không hợp lệ. Vui lòng đăng nhập lại!' });
    }
});

// ==========================================
// 5. API LẤY THÔNG TIN USER (Giữ trạng thái đăng nhập)
// ==========================================
// API này dùng để Frontend gọi mỗi khi user F5 lại trang web
app.get('/api/me', (req, res) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ message: 'Chưa đăng nhập!' });
    }

    if (token !== VALID_ACCESS_TOKEN) {
        // Nếu token hết hạn, báo 401. Interceptor bên Frontend sẽ tự bắt lỗi này,
        // đi xin refresh token mới, sau đó tự gọi lại API /api/me này lần nữa.
        return res.status(401).json({ message: 'Token đã hết hạn!', code: 'TOKEN_EXPIRED' });
    }

    // Trả về thông tin user (tuyệt đối KHÔNG trả về token hay password ở đây)
    res.json({
        id: 101,
        username: 'ductri0981',
        name: 'Trí Đức',
        role: 'admin'
    });
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Backend Server (Cookie Demo) đang chạy tại http://localhost:${PORT}`);
});
