/**
 * BASE DECORATOR (ABSTRACT WRAPPER)
 * 
 * VAI TRÒ TRONG PATTERN:
 * - Đây là lớp cha trừu tượng của toàn bộ các Decorator (BaseDecorator).
 * - Cài đặt (implements) cùng Component Interface: IDataPipeline.
 * - Nắm giữ một tham chiếu (Composition) tới đối tượng được bọc (this.wrappee).
 * - Mặc định ủy quyền lời gọi hàm process(context) cho wrappee bên trong.
 * 
 * CÁC LỚP CON (Concrete Decorators):
 * - Kế thừa lớp này và chèn thêm hành vi TRƯỚC (Pre-processing) hoặc SAU (Post-processing)
 *   hoặc CHẶN ĐỨNG (Short-circuiting như Cache Hit hay Rate Limit Exceeded)
 *   khi gọi this.wrappee.process(context).
 */

const IDataPipeline = require('../domain/IDataPipeline');

class BasePipelineDecorator extends IDataPipeline {
  /**
   * @param {IDataPipeline} wrappee - Đối tượng thành phần nằm ở tầng bên trong
   */
  constructor(wrappee) {
    super();
    if (!wrappee || typeof wrappee.process !== 'function') {
      throw new Error(`Decorator "${this.constructor.name}" yêu cầu đối tượng wrappee phải thực thi IDataPipeline.`);
    }
    this.wrappee = wrappee;
  }

  get layerName() {
    return this.constructor.name;
  }

  /**
   * Mặc định chuyển tiếp request vào sâu bên trong chuỗi bọc
   */
  async process(context) {
    return this.wrappee.process(context);
  }

  /**
   * Tiện ích đệ quy duyệt lấy danh sách toàn bộ các tầng bọc từ ngoài vào trong
   */
  getActiveLayers() {
    const layers = [this.layerName];
    if (this.wrappee instanceof BasePipelineDecorator) {
      layers.push(...this.wrappee.getActiveLayers());
    } else if (this.wrappee && this.wrappee.layerName) {
      layers.push(this.wrappee.layerName);
    }
    return layers;
  }
}

module.exports = BasePipelineDecorator;
