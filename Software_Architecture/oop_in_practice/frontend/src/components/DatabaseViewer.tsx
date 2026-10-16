import React, { useState, useEffect } from 'react';
import { api, RawDatabaseDTO } from '../services/api';
import { RefreshCw, HardDrive } from 'lucide-react';

interface DatabaseViewerProps {
  refreshTrigger: number;
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ refreshTrigger }) => {
  const [data, setData] = useState<RawDatabaseDTO>({ accounts: [], transactions: [] });
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions'>('accounts');
  const [isLoading, setIsLoading] = useState(false);

  const fetchRawDb = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRawDatabase();
      setData(res);
    } catch (e) {
      console.error('Lỗi đọc database.sqlite:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRawDb();
  }, [refreshTrigger]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <HardDrive className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">SQLite Database Inspector (Trực Tiếp Từ Đĩa Cứng)</h3>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">database.sqlite</span>
            </div>
            <p className="text-xs text-slate-500">
              Soi chiếu dữ liệu vật lý lưu trên đĩa cứng để kiểm chứng: <strong>Class OOP chỉ sinh ra tạm thời trong RAM khi xử lý, dữ liệu thật nằm ở SQLite!</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'accounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bảng accounts ({data.accounts.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'transactions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bảng transactions ({data.transactions.length})
            </button>
          </div>

          <button
            onClick={fetchRawDb}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Tải lại từ file SQLite"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {activeTab === 'accounts' ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <th className="p-3 font-semibold">id</th>
                <th className="p-3 font-semibold">account_number</th>
                <th className="p-3 font-semibold">owner_name</th>
                <th className="p-3 font-semibold">balance</th>
                <th className="p-3 font-semibold">status</th>
                <th className="p-3 font-semibold">created_at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data.accounts.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-3 text-slate-400">{row.id}</td>
                  <td className="p-3 font-bold text-indigo-600">{row.account_number}</td>
                  <td className="p-3 font-sans font-semibold text-slate-800">{row.owner_name}</td>
                  <td className="p-3 font-bold text-slate-900">${row.balance.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-slate-400">{new Date(row.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <th className="p-3 font-semibold">id</th>
                <th className="p-3 font-semibold">type</th>
                <th className="p-3 font-semibold">amount</th>
                <th className="p-3 font-semibold">balance_after</th>
                <th className="p-3 font-semibold">description</th>
                <th className="p-3 font-semibold">created_at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-sans">
                    Chưa có giao dịch nào được ghi xuống bảng transactions.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-3 text-slate-400">{tx.id}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-600">${tx.amount}</td>
                    <td className="p-3 text-slate-700">${tx.balance_after}</td>
                    <td className="p-3 font-sans text-slate-600 truncate max-w-xs">{tx.description}</td>
                    <td className="p-3 text-[11px] text-slate-400">{new Date(tx.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};
