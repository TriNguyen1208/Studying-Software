import React from 'react';
import { ShieldCheck, Cpu, GitBranch, Database, Zap } from 'lucide-react';

interface OopConceptLensProps {
  lastExecutionNote: string | null;
}

export const OopConceptLens: React.FC<OopConceptLensProps> = ({ lastExecutionNote }) => {
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
      
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-black text-white text-base">OOP In Action (Lăng Kính Kiến Trúc)</h3>
        </div>
        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-800/40">
          First Principles
        </span>
      </div>

      {/* Thông báo thao tác vừa diễn ra */}
      {lastExecutionNote && (
        <div className="p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 text-xs space-y-1 animate-in fade-in">
          <span className="font-bold text-indigo-300 block text-[11px] uppercase tracking-wider">
            ⚡ Vừa Thực Thi Dưới Tầng Backend:
          </span>
          <p className="text-slate-200 font-medium leading-relaxed">{lastExecutionNote}</p>
        </div>
      )}

      {/* 4 Trụ Cột OOP Được Thể Hiện Trong Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        
        {/* Encapsulation */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>1. Đóng Gói (Encapsulation)</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Trong Class <code>BankAccount</code>, biến số dư <code>#balance</code> được giấu kín. Muốn sửa phải qua <code>withdraw()</code> để kiểm tra đủ tiền và trạng thái tài khoản. Chặn đứng việc gán sai từ bên ngoài.
          </p>
        </div>

        {/* Polymorphism */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Cpu className="w-4 h-4" />
            <span>2. Đa Hình (Polymorphism)</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            <code>StripeGateway</code>, <code>VnPayGateway</code>, <code>MoMoGateway</code> cùng chung interface <code>IPaymentGateway</code>. Service chỉ cần gọi <code>gateway.charge()</code> mà không cần viết lệnh <code>if/else</code> nào.
          </p>
        </div>

        {/* Inheritance */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <GitBranch className="w-4 h-4" />
            <span>3. Kế Thừa (Inheritance)</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            <code>BankingController extends BaseController</code> tái sử dụng logic trả về HTTP và tự động phân loại Domain Error (422 Unprocessable vs 403 Forbidden).
          </p>
        </div>

        {/* Repository Hydration */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Database className="w-4 h-4" />
            <span>4. Data Hydration (SQLite)</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            SQLite trên đĩa lưu dữ liệu thô. Khi có request, <code>SqliteBankAccountRepository</code> mới <code>SELECT</code> 1 dòng lên để nạp vào <code>new BankAccount()</code>, xử lý xong lưu lại đĩa rồi dọn rác RAM.
          </p>
        </div>

      </div>

    </div>
  );
};
