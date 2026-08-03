import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, Mic, Sparkles, X, Camera } from 'lucide-react';
import { InterviewState } from '../types';
import { createSampleReceiptImage } from '../data/sampleData';

interface ChatInputProps {
  onSendMessage: (text: string, image?: string) => void;
  interviewState: InterviewState;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  interviewState,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || disabled) return;

    onSendMessage(inputText.trim(), selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Voice note simulation helper
  const handleVoiceNoteClick = () => {
    if (isRecording) {
      setIsRecording(false);
      setInputText('Doanh thu bán lẻ khoảng 120 triệu/tháng, chi phí nhập hàng và điện nước hết 75 triệu anh nhé.');
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setInputText('Doanh thu trung bình hàng tháng khoảng 100 triệu, chi phí hết 60 triệu.');
      }, 2500);
    }
  };

  // Quick Reply suggestions based on conversation state
  const getQuickReplies = () => {
    switch (interviewState) {
      case 'GREETING':
        return [
          'Dạ em chào anh/chị, em là Mai chủ cửa hàng Tạp hóa Thành Công.',
          'Chào FinAgent, tôi là Hùng kinh doanh quán ăn.',
          'Tôi là Linh, chuyên bán sỉ thời trang quần áo.'
        ];
      case 'FINANCIALS':
        return [
          'Doanh thu bình quân khoảng 120 triệu/tháng, chi phí 75 triệu.',
          'Thu nhập 90 triệu, chi phí sinh hoạt & kinh doanh hết 65 triệu.',
          'Tôi gửi ảnh sổ ghi chép doanh thu & chi phí để FinAgent tự soi nhé!'
        ];
      case 'LOAN_REQ':
        return [
          'Tôi muốn vay khoảng 80 triệu trong 12 tháng để nhập hàng Tết.',
          'Nhu cầu vay 50 triệu sửa lại gian bếp quán ăn.',
          'Cần vay 200 triệu mở rộng kho hàng thời trang.'
        ];
      case 'CONFIRMATION':
      case 'COMPLETED':
        return [
          'Chính xác rồi, nhờ FinAgent xuất Tờ Trình Thẩm Định giúp tôi.',
          'Thông tin đúng rồi em ơi, xuất báo cáo cho bên Ngân hàng nhé.'
        ];
      default:
        return [
          'Gửi ảnh hóa đơn/sổ sách',
          'Tài chính rất ổn định',
          'Đồng ý thẩm định'
        ];
    }
  };

  const quickReplies = getQuickReplies();

  return (
    <div className="bg-white border-t border-slate-200 p-3 sm:p-4 text-slate-800 shadow-md">
      
      {/* Selected Image Preview Bar */}
      {selectedImage && (
        <div className="mb-2 p-2 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={selectedImage}
              alt="Hóa đơn đã chọn"
              className="w-10 h-10 object-cover rounded-lg border border-blue-300"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 block">Đã đính kèm ảnh chứng từ</span>
              <span className="text-[10px] text-[#0068ff] font-medium">FinAgent sẽ tự động trích xuất thông tin</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            type="button"
            className="p-1 hover:bg-blue-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-600 text-xs font-medium animate-pulse">
          <Mic className="w-4 h-4 text-red-500" />
          <span>Đang ghi âm tin nhắn giọng nói (Đang thu âm 00:02)... Bấm lại để hoàn tất.</span>
        </div>
      )}

      {/* Quick Reply Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#0068ff]" />
          Gợi ý Zalo:
        </span>
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (reply.includes('ảnh sổ ghi chép')) {
                const sampleImg = createSampleReceiptImage('grocery_ledger');
                setSelectedImage(sampleImg);
              }
              setInputText(reply);
            }}
            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0068ff] text-xs rounded-full border border-slate-200 whitespace-nowrap transition-colors shrink-0 font-medium"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Form Input Controls */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2 mt-1">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Action Icon 1: Image Upload Button (📷) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0068ff] rounded-xl border border-slate-200 transition-colors shrink-0 flex items-center gap-1.5 text-xs font-medium"
          title="📷 Tải ảnh hóa đơn/sổ tay"
        >
          <ImageIcon className="w-5 h-5 text-[#0068ff]" />
        </button>

        {/* Action Icon 2: Voice Note Button (🎙️) */}
        <button
          type="button"
          onClick={handleVoiceNoteClick}
          className={`p-2.5 rounded-xl border transition-colors shrink-0 flex items-center gap-1.5 text-xs font-medium ${
            isRecording
              ? 'bg-red-500 text-white border-red-600 animate-pulse'
              : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-[#0068ff] border-slate-200'
          }`}
          title="🎙️ Gửi ghi âm giọng nói"
        >
          <Mic className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-[#0068ff]'}`} />
        </button>

        {/* Action Icon 3: Sample Receipt generator */}
        <button
          type="button"
          onClick={() => {
            const sampleImg = createSampleReceiptImage('grocery_ledger');
            setSelectedImage(sampleImg);
            setInputText('Tôi gửi ảnh sổ ghi chép doanh thu & chi phí bán hàng tháng rồi cho FinAgent xem nhé!');
          }}
          className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-200 transition-colors shrink-0 hidden sm:flex items-center gap-1.5 text-xs font-semibold"
          title="Tạo mẫu sổ sách nhanh"
        >
          <Camera className="w-4.5 h-4.5 text-amber-600" />
          <span className="hidden md:inline">Thử Mẫu Sổ Sách</span>
        </button>

        {/* Text Input with requested Zalo placeholder */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={disabled ? "FinAgent đang xử lý..." : "Nhập tin nhắn tới FinAgent..."}
          disabled={disabled}
          className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:bg-white transition-all font-sans"
        />

        {/* Send Button in Zalo Blue (#0068ff) */}
        <button
          type="submit"
          disabled={disabled || (!inputText.trim() && !selectedImage)}
          className="p-2.5 bg-[#0068ff] hover:bg-[#0052cc] disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

