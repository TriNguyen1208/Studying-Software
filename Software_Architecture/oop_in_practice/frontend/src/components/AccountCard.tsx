import React from 'react';
import { AccountDTO } from '../services/api';
import { ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownLeft, Send, CreditCard, Lock, Unlock } from 'lucide-react';

interface AccountCardProps {
  account: AccountDTO;
  isSelected: boolean;
  onSelect: () => void;
  onOpenAction: (type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAY') => void;
  onToggleStatus: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isSelected,
  onSelect,
  onOpenAction,
  onToggleStatus,
}) => {
  const isFrozen = account.status === 'FROZEN';

  return (
    <div
      onClick={onSelect}
      className={`relative p-6 rounded-3xl cursor-pointer transition-all duration-300 border ${
        isSelected
          ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-indigo-500/50 shadow-2xl scale-[1.02]'
          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header card */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-[11px] font-mono tracking-wider ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
            STK: {account.accountNumber}
          </span>
          <h3 className="text-base font-bold tracking-tight mt-0.5">
            {account.ownerName}
          </h3>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isFrozen
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : isSelected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isFrozen ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{account.status}</span>
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
            title={isFrozen ? 'Mở khóa tài khoản' : 'Khóa đóng băng tài khoản'}
            className={`p-1.5 rounded-xl transition-colors ${
              isSelected
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            {isFrozen ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-rose-500" />}
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="mt-6">
        <span className={`text-xs font-medium ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
          Số Dư Hiện Tại
        </span>
        <div className="text-3xl font-black tracking-tight mt-1 flex items-baseline gap-1">
          <span>${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>USD</span>
        </div>
      </div>

      {/* Quick Action buttons */}
      <div className="mt-6 pt-4 border-t border-slate-200/20 grid grid-cols-4 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAction('DEPOSIT');
          }}
          className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
            isSelected
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          <span>Nạp</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAction('WITHDRAW');
          }}
          className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
            isSelected
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-amber-500" />
          <span>Rút</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAction('TRANSFER');
          }}
          className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
            isSelected
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Send className="w-4 h-4 text-sky-500" />
          <span>Chuyển</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAction('PAY');
          }}
          className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
            isSelected
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-400" />
          <span>Cổng Pay</span>
        </button>
      </div>
    </div>
  );
};
