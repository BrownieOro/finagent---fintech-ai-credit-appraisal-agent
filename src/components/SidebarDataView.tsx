import React from 'react';
import { ExtractedData } from '../types';
import { Building, DollarSign, Wallet, CreditCard, PieChart, ShieldCheck, AlertTriangle } from 'lucide-react';

interface SidebarDataViewProps {
  data: ExtractedData;
  onOpenReport: () => void;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Chưa cập nhật';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export const SidebarDataView: React.FC<SidebarDataViewProps> = ({ data, onOpenReport }) => {
  const revenue = data.revenue_monthly || 0;
  const expense = data.expense_monthly || 0;
  const netProfit = revenue - expense;
  const loanAmount = data.loan_amount || 0;
  const termMonths = data.loan_term_months || 12;

  // Approx monthly payment
  const estInstallment = loanAmount > 0 ? (loanAmount / termMonths) + (loanAmount * 0.14 / 12) : 0;
  const estDsr = netProfit > 0 && estInstallment > 0 ? (estInstallment / netProfit) * 100 : 0;

  return (
    <div className="bg-white border-l border-slate-200 text-slate-800 p-4 h-full flex flex-col justify-between overflow-y-auto shadow-xs">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-[#0068ff]">
            <PieChart className="w-5 h-5" />
            <h2 className="font-bold text-sm tracking-wide uppercase">Tài Chính Thẩm Định</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-[#0068ff] font-semibold">Zalo AI Engine</span>
        </div>

        {/* Merchant Card */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-500">
            <Building className="w-4 h-4 text-[#0068ff] shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase">Hộ Kinh Doanh:</span>
          </div>
          <div className="text-sm font-bold text-slate-900 pl-6">
            {data.merchant_name || <span className="text-slate-400 italic">Chưa xác định</span>}
          </div>
          <div className="text-xs text-slate-500 pl-6">
            {data.business_type || <span className="text-slate-400 italic">Mô hình: Đang cập nhật</span>}
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="mt-4 space-y-2.5">
          {/* Revenue */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-emerald-800/80 font-medium">Doanh thu / tháng</div>
                <div className="text-sm font-extrabold text-emerald-700">
                  {formatCurrency(data.revenue_monthly)}
                </div>
              </div>
            </div>
          </div>

          {/* Expense */}
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-700 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-rose-800/80 font-medium">Chi phí / tháng</div>
                <div className="text-sm font-extrabold text-rose-700">
                  {formatCurrency(data.expense_monthly)}
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0068ff]/15 text-[#0068ff] flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-blue-900/80 font-medium">Thu nhập ròng / tháng</div>
                <div className={`text-sm font-extrabold ${netProfit >= 0 ? 'text-[#0068ff]' : 'text-rose-600'}`}>
                  {formatCurrency(netProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Loan Need */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-amber-900/80 font-medium">Nhu cầu vay đề xuất</div>
                <div className="text-sm font-bold text-amber-800">
                  {formatCurrency(data.loan_amount)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick DSR Ratio Preview */}
        {netProfit > 0 && loanAmount > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">Chỉ số DSR dự kiến:</span>
              <span className={`font-bold ${estDsr > 40 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {estDsr.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  estDsr > 40 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, estDsr)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
              {estDsr > 40 ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="text-rose-600 font-medium">DSR vượt ngưỡng 40%</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-medium">DSR an toàn (≤ 40%)</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Report Trigger */}
      <div className="mt-6 pt-3 border-t border-slate-200">
        <button
          onClick={onOpenReport}
          className="w-full py-2.5 px-3 bg-[#0068ff] hover:bg-[#0052cc] text-white rounded-xl font-extrabold text-xs tracking-wide uppercase transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
        >
          <PieChart className="w-4 h-4" />
          <span>Xem Tờ Trình Thẩm Định</span>
        </button>
      </div>
    </div>
  );
};

