/**
 * COMPONENT INTERFACE: IDataPipeline
 * 
 * Đây là "Hợp đồng trừu tượng" (Component Interface) của Decorator Pattern.
 * Cả Concrete Component (BaseStorageService) và mọi Decorator (Timing, Cache, Compression, Encryption, Audit, RateLimit)
 * BẮT BUỘC phải thực thi interface này.
 * 
 * BẢN CHẤT:
 * - Client chỉ tương tác với interface này.
 * - Nhờ vậy, Client không thể (và không cần) phân biệt mình đang gọi trực tiếp Base Component
 *   hay đang gọi qua 5 lớp Decorator bọc lồng nhau!
 */

class IDataPipeline {
  /**
   * Tên định danh của tầng xử lý (layer name)
   */
  get layerName() {
    throw new Error("Getter 'layerName' must be implemented.");
  }

  /**
   * Phương thức xử lý dữ liệu chuẩn mực
   * @param {PipelineContext} context - Dữ liệu và ngữ cảnh đi xuyên qua các tầng bọc
   * @returns {Promise<PipelineResult>} - Kết quả sau khi đã đi qua toàn bộ pipeline
   */
  async process(context) {
    throw new Error("Method 'process(context)' must be implemented.");
  }
}

module.exports = IDataPipeline;
