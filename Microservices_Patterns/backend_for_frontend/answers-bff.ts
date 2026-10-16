/**
 * File: answers-bff.ts
 * ĐÁP ÁN BÀI TẬP BACKEND FOR FRONTEND (BFF)
 * 
 * Yêu cầu: Viết 2 BFF riêng biệt cho Desktop và Mobile.
 * Tự động cắt tỉa và xử lý (Format) dữ liệu phù hợp với sức mạnh/màn hình của thiết bị.
 */

// Lõi Microservice (Vẫn giữ nguyên, đội BE cốt lõi không cần đổi code)
const CoreMovieService = {
    getMovieDetails: async () => {
        return {
            id: "M_001",
            title: "Avengers: Endgame",
            releaseDate: "2019-04-26T00:00:00Z",
            director: "Anthony and Joe Russo",
            budgetUSD: 356000000,
            revenueUSD: 2797800564,
            castIds: ["A_1", "A_2", "A_3", "A_4", "A_5", "A_6", "A_7"],
            technicalSpecs: {
                aspectRatio: "2.39:1",
                camera: "Arri Alexa IMAX",
                soundMix: ["Dolby Digital", "Dolby Atmos", "Auro 11.1"]
            }
        };
    }
};


// ============================================================================
// 1. DESKTOP BFF (Phục vụ Web PC - Màn hình to, Cáp quang mạnh)
// ============================================================================
export class DesktopBFF {
    public async getMovieForWeb() {
        const rawData = await CoreMovieService.getMovieDetails();
        
        console.log(`\n[Desktop BFF] Lấy gần như toàn bộ dữ liệu, chỉ giấu đi vài ID nội bộ...`);
        // Lược bỏ một chút rác, nhưng cơ bản vẫn giữ đầy đủ cấu trúc sâu
        return {
            id: rawData.id,
            title: rawData.title,
            releaseDate: rawData.releaseDate,
            director: rawData.director,
            finances: { // Nhóm lại cho đẹp
                budget: rawData.budgetUSD,
                revenue: rawData.revenueUSD
            },
            technicalSpecs: rawData.technicalSpecs // Web cần hiện spec âm thanh, hình ảnh
        };
    }
}


// ============================================================================
// 2. MOBILE BFF (Phục vụ Điện thoại - Màn hình bé, 4G yếu, CPU yếu)
// ============================================================================
export class MobileBFF {
    public async getMovieForMobile() {
        const rawData = await CoreMovieService.getMovieDetails();
        
        console.log(`\n[Mobile BFF] Đang "cắt gọt" dữ liệu siêu mỏng... Lắp não cho Frontend...`);
        
        // 1. FORMAT SẴN DỮ LIỆU ĐỂ CPU ĐIỆN THOẠI KHÔNG CẦN TÍNH TOÁN
        // Convert 2797800564 thành "$2.79B"
        const formattedRevenue = `$${(rawData.revenueUSD / 1000000000).toFixed(2)}B`;
        
        // Cắt lấy năm 2019 thay vì ISO Date dài ngoằng
        const releaseYear = rawData.releaseDate.split("-")[0];

        // 2. VỨT BỎ 100% CÁC TRƯỜNG THỪA THÃI NHƯ SPEC, CAST IDS
        return {
            id: rawData.id,
            title: rawData.title,
            year: releaseYear, // "2019"
            director: rawData.director,
            revenueStr: formattedRevenue // "$2.80B"
            // Dung lượng JSON bây giờ chỉ còn ~100 bytes! (Giảm 90%)
        };
    }
}


// ============================================================================
// 3. API GATEWAY (Điều phối / Routing)
// Nhận tất cả request từ ngoài vào, kiểm tra User-Agent/Device Type để điều hướng 
// đến đúng BFF tương ứng.
// ============================================================================
export class ApiGateway {
    private desktopBff = new DesktopBFF();
    private mobileBff = new MobileBFF();

    public async handleGetMovieRequest(clientType: "desktop" | "mobile") {
        console.log(`\n[API Gateway] Nhận request từ thiết bị: ${clientType.toUpperCase()} - Đang điều hướng...`);
        
        if (clientType === "mobile") {
            return await this.mobileBff.getMovieForMobile();
        } else {
            return await this.desktopBff.getMovieForWeb();
        }
    }
}


// ============================================================================
// CHẠY THỬ
// ============================================================================
async function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH API GATEWAY + BFF ===");
    
    const gateway = new ApiGateway();

    // 1. Client là Web Browser gọi API
    const pcData = await gateway.handleGetMovieRequest("desktop");
    console.log("Gửi xuống Web Desktop:", pcData);

    // 2. Client là Mobile App gọi API
    const appData = await gateway.handleGetMovieRequest("mobile");
    console.log("Gửi xuống Mobile App (Siêu nhẹ, Tối ưu hóa):", appData);
}

runSuccess();
