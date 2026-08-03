import React, { useRef } from 'react';
import { ReportData } from '../types';
import { X, Printer, Download, AlertTriangle, ShieldCheck, CheckCircle2, FileText, Award } from 'lucide-react';

interface ReportModalProps {
  reportData: ReportData | null;
  isLoading: boolean;
  onClose: () => void;
}

function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Chưa xác định';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export const ReportModal: React.FC<ReportModalProps> = ({
  reportData,
  isLoading,
  onClose,
}) => {
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  if (!reportData && !isLoading) return null;

  const handlePrint = () => {
    if (!reportData?.html_report) return;
    const iframe = printIframeRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(reportData.html_report);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      }
    }
  };

  const handleDownloadHtml = () => {
    if (!reportData?.html_report) return;
    const blob = new Blob([reportData.html_report], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `To_Trinh_Tham_Dinh_${reportData.report_id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Hidden printing iframe */}
      <iframe ref={printIframeRef} className="hidden" title="Print Frame" />

      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Tờ Trình Thẩm Định Tín Dụng</span>
                {reportData && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-mono border border-sky-500/30">
                    {reportData.report_id}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Báo cáo đánh giá năng lực tài chính & đề xuất cấp tín dụng
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2">
            {reportData && (
              <>
                <button
                  onClick={handlePrint}
                  type="button"
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In Tờ Trình</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  type="button"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải Báo Cáo HTML</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/60">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="font-bold text-slate-200">FinAgent đang tổng hợp dữ liệu...</h3>
                <p className="text-xs text-slate-400">Đang tính toán chỉ số DSR, lợi nhuận ròng & xây dựng Tờ trình thẩm định chuẩn Ngân hàng.</p>
              </div>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Risk Level Card */}
                <div className={`p-4 rounded-xl border ${
                  reportData.risk_level === 'CRITICAL' 
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    : reportData.risk_level === 'HIGH'
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                }`}>
                  <div className="text-xs font-semibold uppercase opacity-80 flex items-center justify-between">
                    <span>Mức Độ Rủi Ro:</span>
                    {reportData.risk_level === 'LOW' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-xl font-extrabold mt-1">
                    {reportData.risk_level} RISK
                  </div>
                  <div className="text-[11px] mt-1 opacity-90">
                    DSR: <strong className="underline">{reportData.dsr}%</strong> (Giới hạn: ≤ 40%)
                  </div>
                </div>

                {/* Net Income Card */}
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Lợi Nhuận Ròng Hàng Tháng:</div>
                  <div className="text-xl font-extrabold text-sky-400 mt-1">
                    {formatVND(reportData.net_income)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Doanh thu ({formatVND(reportData.extracted_data.revenue_monthly)}) - Chi phí ({formatVND(reportData.extracted_data.expense_monthly)})
                  </div>
                </div>

                {/* Est Installment Card */}
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Nghĩa Vụ Trả Nợ Ước Tính:</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-1">
                    {formatVND(reportData.estimated_installment)} / tháng
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Gốc + Lãi ước tính cho khoản vay {formatVND(reportData.extracted_data.loan_amount)}
                  </div>
                </div>
              </div>

              {/* Recommendation Banner */}
              <div className="p-4 bg-gradient-to-r from-sky-900/60 to-blue-900/60 border border-sky-700/60 rounded-xl flex items-center space-x-3">
                <Award className="w-8 h-8 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-sky-300 uppercase tracking-wider">Đề xuất phê duyệt tín dụng FinAgent:</div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {reportData.credit_recommendation}
                  </div>
                </div>
              </div>

              {/* HTML Report Preview Canvas */}
              <div className="bg-white rounded-xl shadow-lg border border-slate-300 p-2 sm:p-6 text-slate-900 overflow-x-auto">
                <div className="text-xs font-mono text-slate-400 pb-2 border-b mb-4 flex justify-between items-center">
                  <span>📄 Văn bản Tờ Trình Thẩm Định Bản Quyền FinAgent Core</span>
                  <span>Mã số: {reportData.report_id}</span>
                </div>
                {/* Embed generated HTML directly in preview container */}
                <div 
                  className="report-preview-body"
                  dangerouslySetInnerHTML={{ __html: reportData.html_report }} 
                />
              </div>

            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Đã xác minh qua AI Engine Gemini 3.6 Flash</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
