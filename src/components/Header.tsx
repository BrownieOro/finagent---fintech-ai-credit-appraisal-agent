import React from 'react';
import { Bot, FileText, RefreshCw, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ExtractedData, InterviewState } from '../types';

interface HeaderProps {
  extractedData: ExtractedData;
  interviewState: InterviewState;
  onOpenReport: () => void;
  onResetChat: () => void;
  onSelectSampleScenario: () => void;
  isGeneratingReport?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  extractedData,
  interviewState,
  onOpenReport,
  onResetChat,
  onSelectSampleScenario,
  isGeneratingReport = false,
}) => {
  // Check completion progress
  const hasName = Boolean(extractedData.merchant_name);
  const hasFinancials = Boolean(extractedData.revenue_monthly && extractedData.expense_monthly);
  const hasLoan = Boolean(extractedData.loan_amount);
  const isCompleted = interviewState === 'COMPLETED' || (hasName && hasFinancials && hasLoan);

  const completedCount = [hasName, hasFinancials, hasLoan].filter(Boolean).length;
  const progressPercent = Math.round((completedCount / 3) * 100);

  return (
    <header className="bg-[#0068ff] text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        
        {/* Zalo Header Brand & Identity */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white text-[#0068ff] flex items-center justify-center font-black shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            {/* Online Status Badge (Green dot) */}
            <span 
              className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0068ff] rounded-full" 
              title="Đang hoạt động"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base tracking-tight text-white leading-tight">
                FinAgent - Trợ Lý Tín Dụng Zalo
              </h1>
            </div>
            <p className="text-xs text-blue-100 flex items-center gap-1 opacity-90">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
              Trực tuyến | Thẩm định Hộ kinh doanh
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="hidden md:flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/20">
          <div className="text-right">
            <div className="text-xs font-medium text-blue-50 flex items-center gap-1.5 justify-end">
              Tiến độ: <span className="font-bold text-amber-300">{progressPercent}%</span>
              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
            </div>
            <div className="text-[11px] text-blue-100">
              {completedCount}/3 Hồ sơ (Chủ hộ/Thu chi/Vay)
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Sample Scenario Trigger */}
          <button
            onClick={onSelectSampleScenario}
            type="button"
            className="px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-lg transition-all flex items-center gap-1.5"
            title="Thử nhanh kịch bản mẫu"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Kịch bản</span> Mẫu
          </button>

          {/* Prominent "Xem Tờ Trình Thẩm Định" Button */}
          <button
            onClick={onOpenReport}
            type="button"
            disabled={isGeneratingReport}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shadow-md ${
              isCompleted
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30 ring-2 ring-amber-200 animate-pulse font-black scale-105'
                : 'bg-white hover:bg-blue-50 text-[#0068ff] shadow-blue-900/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Xem Tờ Trình Thẩm Định</span>
            {isCompleted && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded-full uppercase font-bold animate-bounce">
                Sẵn sàng!
              </span>
            )}
          </button>

          {/* Reset Chat Button */}
          <button
            onClick={onResetChat}
            type="button"
            className="p-2 text-blue-100 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
            title="Làm mới trò chuyện"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};

