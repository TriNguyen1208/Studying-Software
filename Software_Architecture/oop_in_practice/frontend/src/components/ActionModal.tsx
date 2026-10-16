import React, { useState } from 'react';
import { AccountDTO, api } from '../services/api';
import { Loader2, X, ShieldAlert } from 'lucide-react';

interface ActionModalProps {
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | null;
  account: AccountDTO | null;
  accountsList: AccountDTO[];
  onClose: () => void;
  onSuccess: (message: string, oopConcept: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  type,
  account,
  accountsList,
  onClose,
  onSuccess,
}) => {
  if (!type || !account) return null;

  const [amount, setAmount] = useState<string>('100');
  const [targetAccountNumber, setTargetAccountNumber] = useState<string>(
    accountsList.find((a) => a.id !== account.id)?.accountNumber || ''
  );
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [domainErrorType, setDomainErrorType] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setDomainErrorType(null);

    const numAmount = parseFloat(amount);

    try {
      let res: any;

      if (type === 'DEPOSIT') {
        res = await api.deposit(account.id, numAmount, description || 'Nạp tiền qua App');
        if (res.success) {
          onSuccess(
            `Nạp thành công $${numAmount} vào tài khoản ${account.accountNumber}`,
            'Encapsulation: Phương thức account.deposit() thực thi, tăng số dư hợp lệ và phát sinh Transaction Entity'
          );
          onClose();
          return;
        }
      } else if (type === 'WITHDRAW') {
        res = await api.withdraw(account.id, numAmount, description || 'Rút tiền ATM');
        if (res.success) {
          onSuccess(
            `Rút thành công $${numAmount} khỏi tài khoản ${account.accountNumber}`,
            'Encapsulation: Phương thức account.withdraw() kiểm tra số dư và trạng thái tài khoản trước khi cho phép rút'
          );
          onClose();
          return;
        }
      } else if (type === 'TRANSFER') {
        res = await api.transfer(
          account.id,
          targetAccountNumber,
          numAmount,
          description || 'Chuyển khoản nội bộ'
        );
        if (res.success) {
          onSuccess(
            `Chuyển thành công $${numAmount} từ ${account.accountNumber} tới ${targetAccountNumber}`,
            'Encapsulation & ACID: Phương thức account.transferTo() tự động điều phối rút tiền từ A và nạp vào B trong cùng 1 SQLite Transaction'
          );
          onClose();
          return;
        }
      }

      // Xử lý lỗi trả về từ Domain Entity hoặc Repository
      if (res && !res.success) {
        setErrorMessage(res.message);
        setDomainErrorType(res.errorType || 'DomainError');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi mạng khi kết nối server');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'DEPOSIT': return 'Nạp Tiền Vào Tài Khoản';
      case 'WITHDRAW': return 'Rút Tiền Khỏi Tài Khoản';
      case 'TRANSFER': return 'Chuyển Khoản Sang Tài Khoản Khác';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">{getTitle()}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đang thao tác trên STK: <span className="font-mono font-bold text-indigo-600">{account.accountNumber}</span> ({account.ownerName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cảnh báo vi phạm luật nghiệp vụ của Class (Domain Exception Banner) */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900 block text-sm">
                  🛡️ Bị Chặn Bởi Luật Đóng Gói (Domain Exception: {domainErrorType})
                </span>
                <p className="mt-1 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <div className="text-[11px] text-rose-700 bg-rose-100/70 p-2.5 rounded-xl font-mono">
              💡 <strong>Bản chất OOP:</strong> Ngoại lệ này được ném ra trực tiếp từ bên trong Class <code>BankAccount</code> để bảo vệ tính toàn vẹn của dữ liệu, không cho phép số dư âm hoặc tài khoản bị khóa giao dịch!
            </div>
          </div>
        )}

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {type === 'TRANSFER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tài Khoản Thụ Hưởng (Người Nhận)
              </label>
              <select
                value={targetAccountNumber}
                onChange={(e) => setTargetAccountNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {accountsList
                  .filter((a) => a.id !== account.id)
                  .map((a) => (
                    <option key={a.id} value={a.accountNumber}>
                      {a.accountNumber} - {a.ownerName} (Số dư: ${a.balance})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số Tiền Giao Dịch (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Số dư hiện có: <strong>${account.balance.toFixed(2)}</strong>. Thử nhập lớn hơn số dư để kiểm chứng lỗi đóng gói!
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi Chú Giao Dịch
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Chuyển tiền ăn tối, Nạp quỹ tiết kiệm..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-2/3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý qua SQLite...</span>
                </>
              ) : (
                <span>Xác Nhận Thực Hiện</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
