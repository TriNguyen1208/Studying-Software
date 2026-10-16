import { useState, useEffect } from 'react';
import { AccountDTO, api } from './services/api';
import { AccountCard } from './components/AccountCard';
import { ActionModal } from './components/ActionModal';
import { PaymentSelector } from './components/PaymentSelector';
import { DatabaseViewer } from './components/DatabaseViewer';
import { OopConceptLens } from './components/OopConceptLens';
import { Landmark, Sparkles, CheckCircle2 } from 'lucide-react';

export function App() {
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [lastOopNote, setLastOopNote] = useState<string | null>(
    'Hệ thống vừa khởi động: SQLite đã tạo 3 tài khoản trên đĩa cứng (database.sqlite). Chưa có dữ liệu nào bị giữ chết trong RAM!'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
      if (!selectedAccountId && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (e) {
      console.error('Lỗi khi fetch danh sách tài khoản:', e);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [refreshTrigger]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;

  const handleActionSuccess = (message: string, oopConcept: string) => {
    setToastMessage(message);
    setLastOopNote(oopConcept);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.toggleStatus(id);
      if (res.success) {
        handleActionSuccess(
          `Đã chuyển trạng thái tài khoản sang: ${res.data.status}`,
          `Encapsulation: Phương thức account.${res.data.status === 'FROZEN' ? 'freeze()' : 'unfreeze()'} của Class BankAccount vừa cập nhật trạng thái nội bộ`
        );
      }
    } catch (e) {
      console.error('Lỗi khi đổi trạng thái tài khoản:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* Top Banner */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-lg tracking-tight">
                Core Banking <span className="text-indigo-600 font-normal">& Multi-Gateway</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-semibold">
                Thực Chiến OOP, Encapsulation, Polymorphism & SQLite Persistence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              SQLite Engine Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center justify-between animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white">✕</button>
          </div>
        )}

        {/* Hero Concept Intro */}
        <section className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bản Chất: Tại Sao Cần OOP & Class Trong Thực Tế?</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Class Không Dùng Để Lưu Dữ Liệu Vĩnh Viễn. <br />
              <span className="text-sky-400 font-bold">Class Dùng Để Đóng Gói Luật Nghiệp Vụ!</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dữ liệu thuộc về <strong>Database SQLite</strong> trên đĩa cứng. Khi có giao dịch rút tiền hoặc chuyển khoản, 
              Repository mới nạp 1 dòng từ SQLite vào <strong>Class BankAccount</strong> trên RAM để bảo vệ bất biến số dư (Encapsulation), 
              sau đó ghi ngược lại đĩa và giải phóng bộ nhớ.
            </p>
          </div>
        </section>

        {/* Section 1: Danh sách tài khoản ngân hàng */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Danh Sách Tài Khoản Ngân Hàng (Accounts)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào một tài khoản để chọn làm tài khoản giao dịch chính.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-xl">
              Tổng cộng: {accounts.length} tài khoản
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                isSelected={acc.id === selectedAccountId}
                onSelect={() => setSelectedAccountId(acc.id)}
                onOpenAction={(action) => {
                  setSelectedAccountId(acc.id);
                  if (action === 'PAY') {
                    setIsPaymentModalOpen(true);
                  } else {
                    setModalType(action);
                  }
                }}
                onToggleStatus={() => handleToggleStatus(acc.id)}
              />
            ))}
          </div>
        </section>

        {/* Section 2: Lăng Kính OOP In Action */}
        <section>
          <OopConceptLens lastExecutionNote={lastOopNote} />
        </section>

        {/* Section 3: Soi Chiếu Dữ Liệu SQLite Thật Trên Đĩa Cứng */}
        <section>
          <DatabaseViewer refreshTrigger={refreshTrigger} />
        </section>

      </main>

      {/* Modals */}
      <ActionModal
        type={modalType}
        account={selectedAccount}
        accountsList={accounts}
        onClose={() => setModalType(null)}
        onSuccess={handleActionSuccess}
      />

      {isPaymentModalOpen && (
        <PaymentSelector
          account={selectedAccount}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handleActionSuccess}
        />
      )}

    </div>
  );
}
