import React, { useState } from 'react';
import { AccountDTO, api } from '../services/api';
import { CreditCard, QrCode, Globe, Loader2, X } from 'lucide-react';

interface PaymentSelectorProps {
  account: AccountDTO | null;
  onClose: () => void;
  onSuccess: (message: string, oopConcept: string) => void;
}

const ITEMS = [
  { id: 'item-1', name: 'Đăng Ký Khóa Học Software Architecture', price: 99 },
  { id: 'item-2', name: 'Gia Hạn Máy Chủ Cloud Dedicated NVMe', price: 250 },
  { id: 'item-3', name: 'Bàn Phím Cơ Custom Ergodox Hotswap', price: 320 }
];

export const PaymentSelector: React.FC<PaymentSelectorProps> = ({
  account,
  onClose,
  onSuccess,
}) => {
  if (!account) return null;

  const [selectedItem, setSelectedItem] = useState(ITEMS[0]);
  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'vnpay' | 'momo'>('stripe');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePay = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.payViaGateway(
        account.id,
        selectedItem.price,
        selectedGateway,
        selectedItem.name
      );

      if (res.success) {
        onSuccess(
          `Thanh toán thành công $${selectedItem.price} qua ${res.data.paymentResult.gatewayName}`,
          `Polymorphism & Abstraction: Interface IPaymentGateway được gọi qua phương thức đa hình .charge() mà không cần bất kỳ lệnh if/else nào trong Core Banking!`
        );
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gọi API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-black text-slate-900">Mô Phỏng Cổng Thanh Toán Đa Hình</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trừ tiền từ STK: <span className="font-mono font-bold text-indigo-600">{account.accountNumber}</span> (Số dư: ${account.balance})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Chọn món hàng cần thanh toán */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            1. Chọn Dịch Vụ Cần Thanh Toán
          </label>
          <div className="grid grid-cols-1 gap-2">
            {ITEMS.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  selectedItem.id === item.id
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
                <span className="text-sm font-black text-indigo-600 font-mono">${item.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chọn cổng thanh toán (Chứng minh Tính Đa Hình) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700">
              2. Chọn Cổng Thanh Toán (Polymorphic Strategy)
            </label>
            <span className="text-[11px] font-semibold text-indigo-600">
              Cùng interface IPaymentGateway
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Stripe */}
            <div
              onClick={() => setSelectedGateway('stripe')}
              className={`p-4 rounded-2xl border cursor-pointer text-center space-y-2 transition-all ${
                selectedGateway === 'stripe'
                  ? 'border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-400/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Globe className="w-6 h-6 text-sky-600 mx-auto" />
              <div className="text-xs font-bold text-slate-800">Stripe Gateway</div>
              <div className="text-[10px] text-slate-500 font-mono">Phí 2.9% + $0.3</div>
            </div>

            {/* VNPay */}
            <div
              onClick={() => setSelectedGateway('vnpay')}
              className={`p-4 rounded-2xl border cursor-pointer text-center space-y-2 transition-all ${
                selectedGateway === 'vnpay'
                  ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-400/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <QrCode className="w-6 h-6 text-rose-600 mx-auto" />
              <div className="text-xs font-bold text-slate-800">VNPay-QR</div>
              <div className="text-[10px] text-slate-500 font-mono">Phí 1.1%</div>
            </div>

            {/* MoMo */}
            <div
              onClick={() => setSelectedGateway('momo')}
              className={`p-4 rounded-2xl border cursor-pointer text-center space-y-2 transition-all ${
                selectedGateway === 'momo'
                  ? 'border-pink-500 bg-pink-50/50 shadow-md ring-2 ring-pink-400/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center mx-auto">
                M
              </div>
              <div className="text-xs font-bold text-slate-800">Ví MoMo Smart</div>
              <div className="text-[10px] text-slate-500 font-mono">Phí 1.5%</div>
            </div>
          </div>
        </div>

        {/* Nút bấm thanh toán */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={isLoading}
            className="w-2/3 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang thực thi đa hình qua cổng...</span>
              </>
            ) : (
              <span>Thanh Toán ${selectedItem.price} (Gọi gateway.charge())</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
