import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { SidebarDataView } from './components/SidebarDataView';
import { ReportModal } from './components/ReportModal';
import { ChatMessage as ChatMessageType, ExtractedData, InterviewState, ReportData } from './types';
import { SAMPLE_SCENARIOS, SampleScenario, createSampleReceiptImage } from './data/sampleData';
import { Sparkles, Bot, ChevronRight, X, AlertCircle } from 'lucide-react';

const INITIAL_EXTRACTED_DATA: ExtractedData = {
  merchant_name: null,
  business_type: null,
  revenue_monthly: null,
  expense_monthly: null,
  loan_amount: null,
  loan_term_months: 12,
  loan_purpose: null,
};

const INITIAL_MESSAGE: ChatMessageType = {
  id: '1',
  sender: 'agent',
  text: 'Dạ em chào anh/chị! Em là FinAgent - Chuyên viên hỗ trợ thẩm định tín dụng cho hộ kinh doanh nhỏ lẻ. Anh/chị cho em xin tên và mô hình kinh doanh buôn bán hiện tại của mình với ạ? (Hoặc có thể gửi ảnh sổ ghi chép/hóa đơn cho em nhé!)',
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  next_state: 'GREETING'
};

export default function App() {
  const [messages, setMessages] = useState<ChatMessageType[]>([INITIAL_MESSAGE]);
  const [extractedData, setExtractedData] = useState<ExtractedData>(INITIAL_EXTRACTED_DATA);
  const [interviewState, setInterviewState] = useState<InterviewState>('GREETING');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Report state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Sample Scenarios modal state
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle sending message to FinAgent Backend
  const handleSendMessage = async (text: string, image?: string) => {
    const userMsgId = Date.now().toString();
    const userMsg: ChatMessageType = {
      id: userMsgId,
      sender: 'user',
      text: text || (image ? 'Đã gửi ảnh chứng từ sổ sách' : ''),
      image,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          image,
          current_data: extractedData,
          current_state: interviewState
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const resData = await response.json();

      if (resData.extracted_data) {
        setExtractedData(resData.extracted_data);
      }
      if (resData.next_state) {
        setInterviewState(resData.next_state);
      }

      const agentMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: resData.reply_to_user || 'Dạ em cảm ơn anh/chị. Anh/chị chia sẻ thêm thông tin nhé!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        extracted_data: resData.extracted_data,
        next_state: resData.next_state
      };

      setMessages((prev) => [...prev, agentMsg]);

    } catch (error: any) {
      console.error('Failed to communicate with FinAgent backend:', error);
      const errorMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        text: 'Có lỗi kết nối tạm thời đến hệ thống FinAgent AI. Xin vui lòng thử lại hoặc gửi lại tin nhắn.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Credit Appraisal Report
  const handleExportReport = async () => {
    setIsReportModalOpen(true);
    setIsGeneratingReport(true);

    try {
      const response = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_data: extractedData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate credit report');
      }

      const data: ReportData = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Load a pre-defined sample scenario
  const handleSelectScenario = (scenario: SampleScenario) => {
    setShowSampleModal(false);
    
    // Create canvas image if needed
    let receiptImage: string | undefined = undefined;
    if (scenario.id === 'grocery_store') {
      receiptImage = createSampleReceiptImage('grocery_ledger');
    } else if (scenario.id === 'eatery_shop') {
      receiptImage = createSampleReceiptImage('eatery_bill');
    } else if (scenario.id === 'fashion_shop') {
      receiptImage = createSampleReceiptImage('clothing_invoice');
    }

    setExtractedData({
      merchant_name: scenario.expectedData.merchant_name,
      business_type: scenario.expectedData.business_type,
      revenue_monthly: scenario.expectedData.revenue_monthly,
      expense_monthly: scenario.expectedData.expense_monthly,
      loan_amount: scenario.expectedData.loan_amount,
      loan_term_months: 12,
      loan_purpose: scenario.expectedData.loan_purpose
    });

    setInterviewState('COMPLETED');

    const scenarioUserMsg: ChatMessageType = {
      id: Date.now().toString(),
      sender: 'user',
      text: scenario.initialMessage,
      image: receiptImage,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const scenarioAgentMsg: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      sender: 'agent',
      text: `Dạ em chào ${scenario.expectedData.merchant_name}! Em đã soi và trích xuất thành công toàn bộ số liệu từ chứng từ của anh/chị: Doanh thu ${new Intl.NumberFormat('vi-VN').format(scenario.expectedData.revenue_monthly)}đ, Chi phí ${new Intl.NumberFormat('vi-VN').format(scenario.expectedData.expense_monthly)}đ, Nhu cầu vay ${new Intl.NumberFormat('vi-VN').format(scenario.expectedData.loan_amount)}đ. Anh/chị bấm nút "Xuất Tờ Trình Thẩm Định" ở góc trên để xem báo cáo nhé!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      next_state: 'COMPLETED'
    };

    setMessages([INITIAL_MESSAGE, scenarioUserMsg, scenarioAgentMsg]);
  };

  // Reset interview
  const handleResetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setExtractedData(INITIAL_EXTRACTED_DATA);
    setInterviewState('GREETING');
    setReportData(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#eef0f3] font-sans text-slate-800 antialiased overflow-hidden">
      
      {/* Header Bar */}
      <Header
        extractedData={extractedData}
        interviewState={interviewState}
        onOpenReport={handleExportReport}
        onResetChat={handleResetChat}
        onSelectSampleScenario={() => setShowSampleModal(true)}
        isGeneratingReport={isGeneratingReport}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Zalo Web Chat Messenger Canvas */}
        <div className="flex-1 flex flex-col justify-between bg-[#eef0f3] relative">
          
          {/* Scrollable Message List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start my-3">
                <div className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-xs text-slate-700 shadow-xs">
                  <Bot className="w-4 h-4 text-[#0068ff] animate-bounce" />
                  <span className="text-xs font-medium text-slate-500">FinAgent đang phân tích & trích xuất dữ liệu...</span>
                  <span className="flex space-x-1 pl-1">
                    <span className="w-1.5 h-1.5 bg-[#0068ff] rounded-full animate-ping" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Dock */}
          <ChatInput
            onSendMessage={handleSendMessage}
            interviewState={interviewState}
            disabled={isLoading}
          />
        </div>

        {/* Right Sidebar: Real-time Financial Scoreboard (Desktop) */}
        <div className="hidden lg:block w-80 shrink-0">
          <SidebarDataView
            data={extractedData}
            onOpenReport={handleExportReport}
          />
        </div>

      </div>

      {/* Credit Appraisal Report Modal */}
      {isReportModalOpen && (
        <ReportModal
          reportData={reportData}
          isLoading={isGeneratingReport}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Sample Scenario Selection Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSampleModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-lg text-slate-100">Chọn Kịch Bản Mẫu Cho Hộ Kinh Doanh</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Thử nghiệm nhanh khả năng bóc tách chứng từ & phỏng vấn thẩm định của FinAgent bằng cách chọn một trong các hồ sơ mẫu dưới đây:
            </p>

            <div className="space-y-3">
              {SAMPLE_SCENARIOS.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-sm text-sky-300 group-hover:text-sky-400">
                      {sc.title}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {sc.description}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transform group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
