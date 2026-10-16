/**
 * File: demo-bff.ts
 * Minh họa Anti-pattern: General-Purpose API (API dùng chung cho tất cả).
 * Gây ra hiện tượng Over-fetching cực kỳ nặng cho các thiết bị Mobile.
 */

// ============================================================================
// LÕI MICROSERVICE BÊN DƯỚI (LUÔN TRẢ RA DATA RẤT TO VÀ PHỨC TẠP)
// ============================================================================
const CoreMovieService = {
    getMovieDetails: async () => {
        return {
            id: "M_001",
            title: "Avengers: Endgame",
            releaseDate: "2019-04-26T00:00:00Z",
            director: "Anthony and Joe Russo",
            budgetUSD: 356000000,
            revenueUSD: 2797800564,
            castIds: ["A_1", "A_2", "A_3", "A_4", "A_5", "A_6", "A_7"], // Cực kỳ dài
            technicalSpecs: {
                aspectRatio: "2.39:1",
                camera: "Arri Alexa IMAX",
                soundMix: ["Dolby Digital", "Dolby Atmos", "Auro 11.1"]
            }
        };
    }
};

// ============================================================================
// API DÙNG CHUNG (ONE-SIZE-FITS-ALL)
// Trả về nguyên si cục này cho mọi thiết bị, dù là màn hình đồng hồ thông minh!
// ============================================================================
class GeneralPurposeApi {
    public async getMovieApi() {
        console.log(`[General API] Đang lấy toàn bộ data nguyên bản từ DB...`);
        const rawData = await CoreMovieService.getMovieDetails();
        
        // Hậu quả 1: Thiết bị Mobile bị tốn băng thông 4G tải các Data dư thừa (technicalSpecs, castIds).
        // Hậu quả 2: Điện thoại phải tự viết code convert tiền từ "2797800564" thành chữ "$2.79B", gây nóng máy.
        return rawData;
    }
}

// --- CHẠY THỬ ---
async function runFail() {
    const api = new GeneralPurposeApi();
    const result = await api.getMovieApi();
    
    console.log("JSON đẩy xuống Điện thoại Mobile (Quá Dư Thừa):");
    console.log(result);
}

runFail();
