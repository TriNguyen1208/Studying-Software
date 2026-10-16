/**
 * File: answers-bounded-context.ts
 * ĐÁP ÁN: CHIA TÁCH GOD CLASS THÀNH CÁC BOUNDED CONTEXT RIÊNG BIỆT
 * 
 * Ta dùng khái niệm `namespace` (hoặc có thể hiểu là module/thư mục/microservice riêng)
 * để tách biệt hoàn toàn mã nguồn của 2 đội Sales và Inventory.
 */

// ============================================================================
// 1. NGỮ CẢNH BÁN HÀNG (SALES BOUNDED CONTEXT)
// Đội Sales chỉ quan tâm làm sao để bán được hàng, show giá đẹp.
// ============================================================================
export namespace SalesContext {
    export class Product {
        constructor(
            public readonly id: string, // ID chung để đồng bộ giữa các Context
            public name: string,
            private price: number,
            private discountPercent: number = 0
        ) {}

        // Chỉ chứa logic về giá cả
        public applyDiscount(percent: number): void {
            if (percent < 0 || percent > 100) throw new Error("Phần trăm giảm giá sai");
            this.discountPercent = percent;
        }

        public getFinalPrice(): number {
            return this.price - (this.price * this.discountPercent / 100);
        }
    }
}


// ============================================================================
// 2. NGỮ CẢNH KHO BÃI (INVENTORY BOUNDED CONTEXT)
// Đội Kho không quan tâm giá tiền, họ chỉ quan tâm hàng nằm ở đâu và nặng bao nhiêu.
// ============================================================================
export namespace InventoryContext {
    export class Product {
        constructor(
            public readonly id: string, // Vẫn là ID đó, nhưng Model khác hoàn toàn
            public readonly name: string, // Tên để hiển thị cho thủ kho dễ đọc
            private stockQuantity: number,
            private warehouseLocation: string,
            public readonly weightInKg: number
        ) {}

        // Logic xuất kho
        public deductStock(amount: number): void {
            if (this.stockQuantity < amount) {
                throw new Error(`Kho [${this.warehouseLocation}] không đủ hàng để xuất.`);
            }
            this.stockQuantity -= amount;
        }

        public getShippingInfo() {
            return `Lấy hàng tại ${this.warehouseLocation}. Trọng lượng kiện hàng: ${this.weightInKg}kg`;
        }
    }
}


// ============================================================================
// CHẠY THỬ (Integration / Hệ thống thực tế)
// ============================================================================
function runSystem() {
    console.log("=== HỆ THỐNG ĐÃ ĐƯỢC CHIA TÁCH BỞI BOUNDED CONTEXT ===");
    const PRODUCT_ID = "IPHONE_15_PRO";

    // Ở Microservice Sales:
    const salesProd = new SalesContext.Product(PRODUCT_ID, "iPhone 15 Pro Max", 30000);
    salesProd.applyDiscount(10);
    console.log(`[Sales API] Bán với giá: ${salesProd.getFinalPrice()} VND`);

    // Ở Microservice Kho bãi (Có database riêng, nhận thông báo qua Event/Message Broker):
    const inventoryProd = new InventoryContext.Product(PRODUCT_ID, "iPhone 15 PM", 100, "Khu_A_Kệ_9", 0.3);
    
    // Khi có Event "Đã thanh toán" bắn sang:
    inventoryProd.deductStock(1);
    console.log(`[Inventory API] Xử lý xuất kho: ${inventoryProd.getShippingInfo()}`);
}

runSystem();
