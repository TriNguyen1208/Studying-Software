import React from 'react';
import { Zap, Shield, Cpu, Clock, Lock, Flame } from 'lucide-react';

export default function DecoratorMatrix() {
  const MATRIX_DATA = [
    {
      name: 'TimingTelemetryDecorator',
      role: 'Đo lường thời gian nano-giây & RAM Heap',
      phase: 'Both (Pre & Post)',
      shortCircuit: 'Không bao giờ',
      overhead: 'Cực thấp (1 cuộc gọi process.hrtime)',
      orderRule: 'Nên đặt ở ngoài cùng (Outer Layer) để đo được toàn bộ chuỗi',
      icon: Clock,
      color: 'text-amber-400'
    },
    {
      name: 'RateLimiterDecorator',
      role: 'Chặn đứng lưu lượng quá tải bằng Token Bucket',
      phase: 'Pre-processing (Trước wrappee)',
      shortCircuit: 'CÓ (Ném 429 khi hết token)',
      overhead: 'Cực thấp (Phép toán số học O(1))',
      orderRule: 'Nên đặt trước Cache và Storage để bảo vệ hạ tầng',
      icon: Flame,
      color: 'text-rose-400'
    },
    {
      name: 'DistributedCacheDecorator',
      role: 'Lưu & nạp dữ liệu từ Redis L1/L2 Cache',
      phase: 'Pre (Kiểm tra) & Post (Lưu cache)',
      shortCircuit: 'CÓ (Trả về ngay khi Cache Hit)',
      overhead: 'Thấp (~0.5ms TCP network socket)',
      orderRule: 'Nên bọc ngoài Compression & Storage để tiết kiệm CPU',
      icon: Zap,
      color: 'text-cyan-400'
    },
    {
      name: 'GzipCompressionDecorator',
      role: 'Nén dữ liệu không mất mát bằng Zlib',
      phase: 'Pre-processing (Biến đổi Payload)',
      shortCircuit: 'Không',
      overhead: 'Trung bình (Tính toán nén CPU)',
      orderRule: 'BẮT BUỘC đặt TRƯỚC Encryption (Compress-then-Encrypt)',
      icon: Cpu,
      color: 'text-emerald-400'
    },
    {
      name: 'AesEncryptionDecorator',
      role: 'Mã hóa quân sự AES-256-GCM với IV/AuthTag',
      phase: 'Pre-processing (Biến đổi Payload)',
      shortCircuit: 'Không',
      overhead: 'Trung bình (Hardware AES-NI tăng tốc)',
      orderRule: 'BẮT BUỘC đặt SAU Compression (Mã hóa trước sẽ làm nén thất bại)',
      icon: Lock,
      color: 'text-purple-400'
    },
    {
      name: 'AuditLogDecorator',
      role: 'Tạo chữ ký SHA-256 & lưu nhật ký kiểm toán',
      phase: 'Post-processing (Sau khi ghi thành công)',
      shortCircuit: 'Không',
      overhead: 'Thấp (1 lần hash SHA-256 + DB Insert)',
      orderRule: 'Thường đặt gần lớp ngoài để ghi nhận kết quả cuối cùng',
      icon: Shield,
      color: 'text-blue-400'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 border-purple-500/30 bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Bảng Ma Trận So Sánh Các Decorator Trong Hệ Thống</span>
              <span className="badge badge-purple text-[10px]">Architectural Blueprint</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Mổ xẻ chi tiết từng Decorator: Giai đoạn can thiệp (Pre vs Post vs Short-circuit), chi phí phần cứng, 
              và quy tắc thứ tự sắp xếp lớp bọc để đạt hiệu quả tối ưu nhất.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold text-slate-300">Tên Decorator</th>
                <th className="py-3.5 px-4">Giai Đoạn Can Thiệp</th>
                <th className="py-3.5 px-4">Khả Năng Short-circuit</th>
                <th className="py-3.5 px-4">Chi Phí CPU & Bộ Nhớ</th>
                <th className="py-3.5 px-4">Quy Tắc Thứ Tự (Ordering Rule)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {MATRIX_DATA.map((row, idx) => {
                const Icon = row.icon;
                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${row.color}`} />
                        <span>{row.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">{row.role}</div>
                    </td>
                    <td className="py-3.5 px-4 text-purple-300 font-mono text-[11px]">{row.phase}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {row.shortCircuit.includes('CÓ') ? (
                        <span className="text-amber-400 font-bold">{row.shortCircuit}</span>
                      ) : (
                        <span className="text-slate-400">{row.shortCircuit}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{row.overhead}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans text-[11px] leading-relaxed max-w-xs">{row.orderRule}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
