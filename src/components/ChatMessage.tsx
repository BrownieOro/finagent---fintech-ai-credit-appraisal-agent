import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { Bot, User, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAgent = message.sender === 'agent';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 bg-white/80 text-slate-600 border border-slate-200/80 rounded-full text-xs font-medium shadow-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 my-3.5 ${isAgent ? 'justify-start' : 'justify-end'}`}>
      {/* Agent Avatar (Zalo Style) */}
      {isAgent && (
        <div className="w-8 h-8 rounded-full bg-[#0068ff] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-blue-200">
          <Bot className="w-4.5 h-4.5" />
        </div>
      )}

      {/* Message Content Container */}
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}>
        {/* Chat Bubble */}
        <div className={`rounded-2xl p-3.5 shadow-xs space-y-2 border transition-all ${
          isAgent
            ? 'bg-white text-slate-800 border-slate-200/80 rounded-tl-xs'
            : 'bg-[#e5efff] text-slate-900 border-blue-200/80 rounded-tr-xs'
        }`}>
          
          {/* Attached Image Preview */}
          {message.image && (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 mb-2 max-w-xs bg-slate-100">
              <img
                src={message.image}
                alt="Hóa đơn / Sổ ghi chép"
                className="w-full h-auto max-h-52 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => {
                  const win = window.open();
                  if (win) {
                    win.document.write(`<img src="${message.image}" style="max-width:100%;" />`);
                  }
                }}
              />
              <div className="absolute bottom-1.5 right-1.5 bg-slate-900/75 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] text-white font-medium flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-sky-300" />
                <span>Chứng từ đính kèm</span>
              </div>
            </div>
          )}

          {/* Text Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800">
            {message.text}
          </p>
        </div>

        {/* Timestamp under bubble (Zalo style) */}
        <div className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
          {message.timestamp}
        </div>
      </div>

      {/* User Avatar */}
      {!isAgent && (
        <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-slate-300">
          <User className="w-4.5 h-4.5" />
        </div>
      )}
    </div>
  );
};

