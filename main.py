import os
import json
import base64
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Request, Form, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from google import genai
from google.genai import types

app = FastAPI(title="FinAgent - Trợ Lý Tín Dụng Zalo", version="1.0.0")

# Setup templates directory
templates = Jinja2Templates(directory="templates")

# Initialize Gemini Client lazily
def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable is not configured.")
    return genai.Client(api_key=api_key)

SYSTEM_INSTRUCTION = """
Bạn là FinAgent - Trợ lý Tín dụng AI chuyên nghiệp trên nền tảng Zalo, tư vấn và thẩm định tín dụng cho Ngân hàng / Tổ chức tài chính dành cho các Hộ Kinh Doanh Nhỏ Lẻ tại Việt Nam.

Nhiệm vụ chính:
1. Hỏi và thu thập 3 nhóm thông tin quan trọng một cách lịch sự, tự nhiên như trò chuyện Zalo:
   - Tên Hộ Kinh Doanh / Chủ hộ & Loại hình kinh doanh (Ví dụ: Tiệm tạp hóa, Quán ăn, Cửa hàng quần áo...).
   - Doanh thu & Chi phí ước tính hàng tháng (Thu thập trực tiếp qua lời khai hoặc trích xuất từ hình ảnh sổ tay / hóa đơn / sao kê mà khách hàng đính kèm).
   - Nhu cầu vay: Số tiền vay đề xuất & Thời hạn vay mong muốn (tháng).
2. Xử lý và Phân tích hình ảnh (nếu có): Nếu người dùng gửi ảnh sổ ghi chép, hóa đơn, biên nhận, hãy tự động trích xuất các con số doanh thu, chi phí hoặc tiền nhập hàng.
3. Khi đã có đủ dữ liệu thu nhập và nhu cầu vay, tính toán nhanh:
   - Thu nhập ròng (Net Profit) = Doanh thu - Chi phí.
   - Ước tính gốc lãi hàng tháng = (Số tiền vay / Thời hạn vay) + (Số tiền vay * 1% lãi suất/tháng).
   - Tỷ lệ trả nợ DSR (%) = (Gốc lãi hàng tháng / Thu nhập ròng) * 100.
4. Đánh giá rủi ro nhanh:
   - DSR <= 40%: Mức độ rủi ro Thấp - Khả năng phê duyệt CAO.
   - DSR > 40%: Mức độ rủi ro Trung bình / Cao - Cần xem xét giảm hạn mức vay hoặc bổ sung tài sản đảm bảo.

Cấu trúc JSON phản hồi bắt buộc:
Trả về phản hồi theo định dạng JSON phẳng duy nhất sau (không đặt trong markdown ```json):
{
  "reply": "Lời nhắn phản hồi thân thiện dành cho khách hàng trên Zalo",
  "extracted_data": {
    "merchant_name": "Tên chủ hộ/tên tiệm (hoặc null)",
    "business_type": "Mô hình kinh doanh (hoặc null)",
    "revenue_monthly": 100000000, // số nguyên VND (hoặc null)
    "expense_monthly": 60000000,  // số nguyên VND (hoặc null)
    "loan_amount": 150000000,     // số nguyên VND (hoặc null)
    "loan_term_months": 24         // số tháng (hoặc null)
  },
  "interview_completed": false // chuyển thành true khi đã thu thập đủ Tên hộ, Doanh thu, Chi phí và Nhu cầu vay
}
"""

class ChatRequest(BaseModel):
    message: str
    image_base64: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None

@app.get("/", response_class=HTMLResponse)
async def read_root():
    # Tự tìm file index.html dù nó nằm ở đâu
    if os.path.exists("templates/index.html"):
        with open("templates/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    elif os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    else:
        return HTMLResponse(content="<h1>Chưa thấy file index.html trên GitHub! Kiểm tra lại folder giúp tui nha.</h1>")
    
@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    try:
        client = get_gemini_client()
        contents = []

        prompt_text = f"Thông tin đã thu thập trước đó: {json.dumps(payload.extracted_data or {}, ensure_ascii=False)}\nTin nhắn mới từ người dùng: {payload.message}"
        contents.append(prompt_text)

        if payload.image_base64:
            # Decode base64 image if present
            header, base64_data = payload.image_base64.split(",", 1) if "," in payload.image_base64 else ("", payload.image_base64)
            image_bytes = base64.b64decode(base64_data)
            contents.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )
            )

        # ✅ Đổi về gemini-1.5-flash chuẩn đét của Google AI Studio
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        result_json = json.loads(response.text)
        return JSONResponse(content=result_json)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "reply": f"FinAgent gặp gián đoạn nhỏ: {str(e)}. Xin vui lòng thử lại!",
                "extracted_data": payload.extracted_data or {},
                "interview_completed": False
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)