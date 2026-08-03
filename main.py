import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from google import genai
from google.genai import types

app = FastAPI(title="FinAgent - Trợ Lý Tín Dụng Zalo", version="1.0.0")

# Initialize Gemini Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

class ChatRequest(BaseModel):
    message: str
    image_base64: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    reply: str
    extracted_data: Dict[str, Any]
    interview_state: str
    is_completed: bool

@app.get("/", response_class=HTMLResponse)
def get_chat_ui():
    html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FinAgent - Trợ Lý Tín Dụng Zalo</title>
  <!-- Clean Tailwind CSS CDN without markdown wrappers -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    .scrollbar-none::-webkit-scrollbar { display: none; }
    .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-[#eef0f3] font-sans text-slate-800 antialiased h-screen flex flex-col overflow-hidden">

  <!-- Zalo Blue Header -->
  <header class="bg-[#0068ff] text-white sticky top-0 z-30 shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
      
      <!-- Brand & Identity -->
      <div class="flex items-center space-x-3">
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-white text-[#0068ff] flex items-center justify-center font-black shadow-inner">
            <i data-lucide="bot" class="w-6 h-6"></i>
          </div>
          <!-- Online status dot -->
          <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0068ff] rounded-full" title="Đang hoạt động"></span>
        </div>
        <div>
          <h1 class="font-bold text-base tracking-tight text-white leading-tight">
            FinAgent - Trợ Lý Tín Dụng Zalo
          </h1>
          <p class="text-xs text-blue-100 flex items-center gap-1 opacity-90">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
            Trực tuyến | Thẩm định Hộ kinh doanh
          </p>
        </div>
      </div>

      <!-- Action Button in Header -->
      <div class="flex items-center space-x-2">
        <button 
          id="btnReport"
          onclick="toggleReportModal()"
          type="button" 
          className="px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shadow-md bg-white text-[#0068ff] hover:bg-blue-50"
          style="background-color: white; color: #0068ff; padding: 8px 16px; border-radius: 8px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;"
        >
          <i data-lucide="file-text" class="w-4 h-4"></i>
          <span>Xem Tờ Trình Thẩm Định</span>
        </button>
      </div>

    </div>
  </header>

  <!-- Main Body -->
  <main class="flex-1 flex overflow-hidden">
    <!-- Chat Area -->
    <div class="flex-1 flex flex-col justify-between bg-[#eef0f3] relative">
      <!-- Scrollable Messages -->
      <div id="messageList" class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        <!-- Agent Initial Message -->
        <div class="flex gap-2.5 my-3.5 justify-start">
          <div class="w-8 h-8 rounded-full bg-[#0068ff] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 border border-blue-200">
            <i data-lucide="bot" class="w-4 h-4"></i>
          </div>
          <div class="max-w-[85%] sm:max-w-[75%] flex flex-col items-start">
            <div class="rounded-2xl p-3.5 shadow-xs space-y-2 border bg-white text-slate-800 border-slate-200/80 rounded-tl-xs">
              <p class="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800">Xin chào anh/chị! Em là FinAgent - Trợ lý AI thẩm định tín dụng. Em có thể hỗ trợ anh/chị thu thập thông tin để lập Tờ Trình Thẩm Định Hộ Kinh Doanh. Cho em hỏi tên Hộ kinh doanh và địa chỉ cửa hàng của mình được không ạ?</p>
            </div>
            <div class="text-[10px] text-slate-400 mt-1 px-1 font-medium">09:00 AM</div>
          </div>
        </div>
      </div>

      <!-- Input Area (Bottom Bar) -->
      <div class="bg-white border-t border-slate-200 p-3 sm:p-4 text-slate-800 shadow-md">
        
        <!-- Image Preview Bar -->
        <div id="imagePreview" class="hidden mb-2 p-2 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <img id="previewImg" src="" class="w-10 h-10 object-cover rounded-lg border border-blue-300" />
            <div>
              <span class="text-xs font-semibold text-slate-800 block">Đã đính kèm ảnh chứng từ</span>
              <span class="text-[10px] text-[#0068ff] font-medium">FinAgent sẽ tự động trích xuất thông tin</span>
            </div>
          </div>
          <button onclick="removeImage()" type="button" class="p-1 hover:bg-blue-100 rounded-lg text-slate-500">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Quick Reply Suggestions -->
        <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none mb-1">
          <span class="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3 h-3 text-[#0068ff]"></i> Gợi ý:
          </span>
          <button onclick="sendQuickReply('Hộ Kinh Doanh Tạp Hóa Minh Phát, 123 Nguyễn Trãi, Q.5')" class="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 text-xs rounded-full border border-slate-200 shrink-0 font-medium">
            Tạp Hóa Minh Phát, Q.5
          </button>
          <button onclick="sendQuickReply('Doanh thu trung bình 120 triệu/tháng, chi phí hết 75 triệu')" class="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 text-xs rounded-full border border-slate-200 shrink-0 font-medium">
            DT 120tr - Chi 75tr
          </button>
          <button onclick="sendQuickReply('Muốn vay 150 triệu trong 24 tháng để nhập hàng Tết')" class="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 text-xs rounded-full border border-slate-200 shrink-0 font-medium">
            Vay 150 triệu - 24 tháng
          </button>
        </div>

        <form onsubmit="handleSend(event)" class="flex items-center space-x-2">
          <input type="file" id="fileInput" accept="image/*" class="hidden" onchange="handleFileSelect(event)" />
          
          <!-- Action Icon 1: Image Upload (📷) -->
          <button type="button" onclick="document.getElementById('fileInput').click()" class="p-2.5 bg-slate-100 hover:bg-blue-50 text-[#0068ff] rounded-xl border border-slate-200 shrink-0" title="📷 Tải ảnh hóa đơn/sổ tay">
            <i data-lucide="image" class="w-5 h-5"></i>
          </button>

          <!-- Action Icon 2: Voice Note (🎙️) -->
          <button type="button" onclick="handleVoiceNote()" class="p-2.5 bg-slate-100 hover:bg-blue-50 text-[#0068ff] rounded-xl border border-slate-200 shrink-0" title="🎙️ Gửi ghi âm giọng nói">
            <i data-lucide="mic" class="w-5 h-5"></i>
          </button>

          <!-- Input field with requested placeholder -->
          <input 
            type="text" 
            id="userInput" 
            placeholder="Nhập tin nhắn tới FinAgent..." 
            class="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0068ff] focus:bg-white transition-all"
          />

          <!-- Send Button in Zalo Blue (#0068ff) -->
          <button type="submit" class="p-2.5 bg-[#0068ff] hover:bg-[#0052cc] text-white rounded-xl transition-all shadow-md shrink-0">
            <i data-lucide="send" class="w-4 h-4"></i>
          </button>
        </form>
      </div>
    </div>
  </main>

  <script>
    let currentImage = null;

    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          currentImage = evt.target.result;
          document.getElementById('previewImg').src = currentImage;
          document.getElementById('imagePreview').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    }

    function removeImage() {
      currentImage = null;
      document.getElementById('imagePreview').classList.add('hidden');
      document.getElementById('fileInput').value = '';
    }

    function sendQuickReply(text) {
      document.getElementById('userInput').value = text;
      handleSend(new Event('submit'));
    }

    function handleVoiceNote() {
      const input = document.getElementById('userInput');
      input.value = "Doanh thu bán lẻ khoảng 120 triệu/tháng, chi phí nhập hàng và điện nước hết 75 triệu anh nhé.";
      alert("🎙️ Đã chuyển giọng nói thành văn bản!");
    }

    async function handleSend(e) {
      e.preventDefault();
      const input = document.getElementById('userInput');
      const text = input.value.trim();
      if (!text && !currentImage) return;

      const list = document.getElementById('messageList');
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Append User Message (Right) - Light blue bubble (#e5efff)
      const userHtml = `
        <div class="flex gap-2.5 my-3.5 justify-end">
          <div class="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
            <div class="rounded-2xl p-3.5 shadow-xs space-y-2 border bg-[#e5efff] text-slate-900 border-blue-200/80 rounded-tr-xs">
              ${currentImage ? `<img src="${currentImage}" class="max-h-48 rounded-lg mb-2" />` : ''}
              <p class="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800">${text}</p>
            </div>
            <div class="text-[10px] text-slate-400 mt-1 px-1 font-medium">${now}</div>
          </div>
          <div class="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 border border-slate-300">
            <i data-lucide="user" class="w-4 h-4"></i>
          </div>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', userHtml);

      input.value = '';
      const sentImage = currentImage;
      removeImage();
      list.scrollTop = list.scrollHeight;

      // Call API or local handler
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, image_base64: sentImage })
        });
        const data = await res.json();

        // Bot Message (Left) - White bubble
        const botHtml = `
          <div class="flex gap-2.5 my-3.5 justify-start">
            <div class="w-8 h-8 rounded-full bg-[#0068ff] text-white flex items-center justify-center shrink-0 border border-blue-200">
              <i data-lucide="bot" class="w-4 h-4"></i>
            </div>
            <div class="max-w-[85%] sm:max-w-[75%] flex flex-col items-start">
              <div class="rounded-2xl p-3.5 shadow-xs space-y-2 border bg-white text-slate-800 border-slate-200/80 rounded-tl-xs">
                <p class="text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800">${data.reply || 'Cảm ơn anh/chị, em đã ghi nhận thông tin.'}</p>
              </div>
              <div class="text-[10px] text-slate-400 mt-1 px-1 font-medium">${now}</div>
            </div>
          </div>
        `;
        list.insertAdjacentHTML('beforeend', botHtml);
        lucide.createIcons();
        list.scrollTop = list.scrollHeight;
      } catch (err) {
        console.error(err);
      }
    }

    function toggleReportModal() {
      alert("📄 Tờ Trình Thẩm Định Tín Dụng đã hoàn tất! Quý vị có thể xuất bản in PDF hoặc xem chi tiết.");
    }

    window.onload = function() {
      lucide.createIcons();
    };
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    # Standard mock response if API Key is not configured
    reply_text = f"Cảm ơn anh/chị đã chia sẻ. Em đã ghi nhận thông tin: '{req.message}'. Anh/chị có nhu cầu đăng ký khoản vay bao nhiêu ạ?"
    
    # If GEMINI_API_KEY is present, process with Gemini 1.5 Flash
    if GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=f"Bạn là FinAgent, trợ lý tín dụng ngân hàng trên Zalo. Trả lời thân thiện, ngắn gọn và hỏi tiếp để hoàn thiện hồ sơ thẩm định: {req.message}"
            )
            if response and response.text:
                reply_text = response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")

    return ChatResponse(
        reply=reply_text,
        extracted_data={"merchant_name": "Tạp Hóa Minh Phát", "revenue_monthly": 120000000, "expense_monthly": 75000000, "loan_amount": 150000000},
        interview_state="financials",
        is_completed=False
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
